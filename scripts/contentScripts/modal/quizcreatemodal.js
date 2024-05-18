import { toggleNavbarVisibility } from '../navbar/navbar.js';
import { HOST, LoaAxios, REPORT_PROCESSING_HOST } from '../network/LoaAxios.js';
import { SubtitleContentsRequest, loadSubtitles } from '../subtitle/subtitle.js';
import { loadDefaultElementsForWorkbook, workbookContext } from '../workbook/workbook.js';

let iframeQuizzes = [];



export async function showCreateModal() {
    
    const currentURL = window.location.href;

    const courseTitleElement = document.querySelector('.css-1pqj6dl');
    const subCourseTitleElement = document.querySelector('.css-1vtpfoe');
    const playTimeElement = document.querySelector('.shaka-current-time');

    const courseTitle = courseTitleElement ? courseTitleElement.textContent : 'N/A';
    const subCourseTitle = subCourseTitleElement ? subCourseTitleElement.textContent : 'N/A';
    const playTime = playTimeElement ? playTimeElement.textContent : 'N/A';


    const videoContainer = document.querySelector('.shaka-video-container');
    if (!videoContainer) {
        console.error('Video container not found');
        return;
    }

    const modal = document.createElement('div');
    modal.classList.add('overlay');
    modal.innerHTML = `
        <div class="draggable-header"></div>
        <iframe id="iframeContent" class="close" src="" style="width:100%; height:100%;"></iframe>
    `;
    videoContainer.appendChild(modal);
    modal.style.width = '50%';
    modal.style.height = '100%';
    modal.style.position = 'absolute';

    const draggableHeader = modal.querySelector('.draggable-header');
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    draggableHeader.style.position = 'absolute';
    draggableHeader.style.width = '100%';
    draggableHeader.style.height = '30px';
    draggableHeader.style.top = '0';
    draggableHeader.style.left = '0';
    draggableHeader.style.cursor = 'move';
    draggableHeader.style.backgroundColor = '#ccc';

    draggableHeader.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX - modal.offsetLeft;
        startY = e.clientY - modal.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            modal.style.left = `${e.clientX - startX}px`;
            modal.style.top = `${e.clientY - startY}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
        }
    });

    function setIframeUrl(url) {
        const iframe = document.getElementById('iframeContent');
        if (iframe) {
            iframe.src = url;
            iframe.onload = function() {
                const data = {
                    courseTitle,
                    subCourseTitle,
                    playTime,
                    currentURL,
                    iframeQuizzes,
                };
                iframe.contentWindow?.postMessage(data, '*');
            };
        }
    }
    await AIQuizSetControllerForExtension();
    await setIframeUrl(`${REPORT_PROCESSING_HOST}/createforextension`);

}

async function AIQuizSetControllerForExtension() {
    let quizRequestTimes = [];
    let lastRequestTimeIdx = 0;
    

    function calculateRequestTimes(durationInSeconds) {
        let quizRequestTimes = [];
        const durationInMinutes = durationInSeconds / 60;

        let numberOfQuizzes;
        if (durationInMinutes < 5) {
            return [];
        } else if (durationInMinutes <= 10) {
            numberOfQuizzes = 1;
        } else if (durationInMinutes <= 60) {
            numberOfQuizzes = 3;
        } else {
            numberOfQuizzes = Math.min(Math.ceil(durationInMinutes / 20), 5);
        }
        const interval = durationInSeconds / (numberOfQuizzes + 1);
        for (let i = 1; i <= numberOfQuizzes; i++) {
            quizRequestTimes.push(Math.round(interval * i));
        }
        return quizRequestTimes;
    }

    async function select() {
        const video = workbookContext.videoElement;
        if (!video) {
            console.error('Video element not found');
            return false;
        }
        quizRequestTimes = calculateRequestTimes(parseInt(video.duration));
        if (quizRequestTimes.length === 0) {
            return false;
        }
        await loadSubtitles();
        await fetchAllQuiz();
        return true;
    }

    function getSubtitleContents(prevReqTime, reqTime) {
        const subtitleRequest = new SubtitleContentsRequest();
        return subtitleRequest.getRangeSubtitleContents(prevReqTime, reqTime);
    }

    function hasAllProperties(response) {
        return (
            response.instruction &&
            response.commentary &&
            response.choices.length > 0 &&
            response.popupTime > 0
        );
    }
    
    async function fetchAllQuiz() {
        for (let i = 0; i < quizRequestTimes.length; i++) {
            await console.log(quizRequestTimes);
            await fetchQuiz(i);
        }
    }

    async function fetchQuiz(i) {
        return new Promise((resolve, reject) => {
            const reqTime = quizRequestTimes[i];
            const prevReqTime = lastRequestTimeIdx === i ? 0 : quizRequestTimes[lastRequestTimeIdx];
            lastRequestTimeIdx = i;
            
            // 콜백을 사용하여 비동기 처리
            LoaAxios.post(
                `${HOST}/api/quizsets/llm/nosave`,
                {
                    subLectureId: workbookContext.subLectureId,
                    script: getSubtitleContents(prevReqTime, reqTime),
                    popupTime: reqTime,
                },
                (response) => {
                    console.log('response = ', response);
                    if (hasAllProperties(response)) {
                        iframeQuizzes.push(response);
                        resolve();
                    } else {
                        reject('invalid response');
                    }
                }
            );
        }).catch(error => {
            console.error('Error fetching quiz:', error);
            throw error;
        });
    }
    
    
    

    return select();
}
