import { workbookContext } from "../workbook";
import { LoaAxios, HOST } from "../../network/LoaAxios";

const popupSound = new Audio(chrome.runtime.getURL('sounds/quiz-popup.mp3'));
const timeTickingSound = new Audio(chrome.runtime.getURL('sounds/quiz-time-ticking.mp3'));
const correctSound = new Audio(chrome.runtime.getURL('sounds/quiz-correct.mp3'));
const wrongSound = new Audio(chrome.runtime.getURL('sounds/quiz-wrong.mp3'));

function QuizView(instruction) {
  return `
        <div class="modal-content center">
            <span class="learn-on-air">LEARN ON-AIR</span>
            <div class="modal-header">  
              <h1 class="modal-title">${instruction}</h1>
              <img src="https://velog.velcdn.com/images/byk0316/post/5f89557b-72ba-4821-9552-41a3401d8f73/image.png" alt="Image" class="header-image">
            </div>
            <div class="modal-body" id="choices-container">
            </div>
            <div class="modal-footer">
                <button type="button" id="submit-btn" class="submit-btn">제출하기</button>
            </div>
        </div>
        `;
}

function createQuizModal() {
  const videoContainer = document.querySelector(".shaka-video-container");
  const quizModal = document.createElement("div");
  quizModal.id = "quiz-modal";
  quizModal.classList.add("overlay");
  videoContainer.parentNode.appendChild(quizModal);
  return quizModal;
}

/**
 * 현재 풀고 있는 퀴즈 객체를 반환한다.
 * @returns 퀴즈 객체 (API 문서 참고)
 */
function getCurrentQuiz(quizIdx) {
  return workbookContext.curQuizzes[quizIdx];
}

/**
 * 선택지가 정답인지를 확인한다.
 * @param {*: number} choiceId 선택지 id
 * @returns 정답여부
 */
function isAnswer(choiceId, quizIdx) {
  const curQuiz = getCurrentQuiz(quizIdx);
  for (const choice of curQuiz.choices) {
    if (choice.choiceId === choiceId && choice.isAnswer) {
      return true;
    }
  }
  return false;
}

/**
 * 선택지들 중에서 사용자가 선택한 선택지는 selected 클래스를 가지고 있다.
 * 사용자가 선택한 선택지를 서버에 전송하고 결과를 화면에 보여준다.
 *
 * @param {[HTMLElement]} choices 문제에 속하는 선택지들
 * @param {HTMLElement} quizModal 현재 떠있는 문제 모달창
 * @param {HTMLElement} video 현재 보고 있는 강의 영상
 */
async function sendQuizResultAndRender(
  isSended,
  quizIdx,
  choices,
  quizModal,
  video,
  solvedDuration
) {
  const selectedChoiceId = getSelectedChoiceId(choices);
  if (selectedChoiceId === null) {
    alert("답안을 선택해주세요.");
    return;
  }
  const isCorrect = isAnswer(selectedChoiceId, quizIdx);
  isCorrect ? await correctSound.play() : await wrongSound.play();

  if(!isSended){
    saveQuizResult(selectedChoiceId, isCorrect, solvedDuration);
    workbookContext.curQuizzes[quizIdx].isSended = true;
  }
    
  
  const modalFooter = quizModal.querySelector(".modal-footer");
  modalFooter.innerHTML = "";

  const continueBtn = document.createElement("button");
  continueBtn.type = "button";
  continueBtn.id = "continue-btn";
  continueBtn.className = "continue-btn";
  continueBtn.innerText = "계속 진행하기";
  continueBtn.addEventListener("click", () => {
    quizModal.remove();
    video.play();
  });
  modalFooter.appendChild(continueBtn);
  if (!isCorrect) {
    const goBackBtn = document.createElement("button");
    goBackBtn.type = "button";
    goBackBtn.id = "go-back-btn";
    goBackBtn.className = "go-back-btn";
    goBackBtn.innerText = "문제 나왔던 부분 다시듣기";
    goBackBtn.addEventListener("click", () => {
      if (quizIdx == 0) {
        video.currentTime = 0;
      } else {
        video.currentTime =
          workbookContext.curQuizzes[quizIdx - 1].popupTime + 1;
      }
      quizModal.remove();
      video.play();
    });
    modalFooter.appendChild(goBackBtn);
  }
    const commentaryBtn = document.createElement("button");
    commentaryBtn.type = "button";
    commentaryBtn.id = "commentary-btn";
    commentaryBtn.className = "commentary-btn";
    commentaryBtn.innerText = "해설보기";
    commentaryBtn.addEventListener("click", () => {
      const newModal = document.createElement("div");
      newModal.classList.add("overlay");
      newModal.innerHTML = `
        <div class="modal-content commentary center">
          <div class="modal-body">
            ${workbookContext.curQuizzes[quizIdx].commentary}
          </div>
          <div class="modal-footer">
            <button type="button" class="close-button">닫기</button>
          </div>
        </div>
      `;

      const closeButton = newModal.querySelector(".close-button");
      closeButton.addEventListener("click", () => {
        newModal.remove();
        video.play();
      });

      // 기존의 퀴즈 모달을 제거
      // quizModal.remove();

      const videoContainer = document.querySelector(".shaka-video-container");
      videoContainer.parentNode.appendChild(newModal);
    });

    modalFooter.appendChild(commentaryBtn);
}

// 선택한 선택지의 id를 반환하는 함수
function getSelectedChoiceId(choices) {
  for (const choice of choices) {
    if (choice.classList && choice.classList.contains("selected")) {
      return parseInt(choice.id.split("-")[1]);
    }
  }
  return null;
}

async function saveQuizResult(choiceId, isCorrect, solvedDuration) {
  // 서버에 선택한 선택지의 id와 정답 여부를 전송하여 저장
  LoaAxios.post(
    `${HOST}/api/quizsets/quizResults`,
    {
      choiceId,
      isCorrect,
      solvedDuration,
      lectureHistoriesId: workbookContext.lectureHistoryId,
    },
    (response) => {
      if (!response) {
        console.error("Doesn't make quizResult!");
      }
    }
  );
}

async function addPopupSideEffect() {
  const quizModalContent = document.querySelector("#quiz-modal .modal-content")
  quizModalContent.classList.add("reveal");
  await popupSound.play();
  await timeTickingSound.play();
}

export function popupQuiz(quizIdx) {
  // 팝업창이 띄워진 시점의 시간
  const popupTime = new Date().getTime();
  const quizzes = workbookContext.curQuizzes;
  const quiz = quizzes[quizIdx];
  const quizModal = createQuizModal();

  quizModal.innerHTML = QuizView(quiz.instruction);
  const choicesContainer = document.getElementById("choices-container");
  if (quiz.choices.length === 1) {
    const inputField = document.createElement("input");
    inputField.type = "text";
    inputField.placeholder = "정답을 입력해주세요";
    inputField.className = "input-answer";
    choicesContainer.appendChild(inputField);
  } else {
    for (const choice of quiz.choices) {
      const choiceBtn = document.createElement("button");
      choiceBtn.type = "button";
      choiceBtn.id = `choice-${choice.choiceId}`;
      choiceBtn.className = "btn";
      choiceBtn.innerText = choice.content;
      choiceBtn.addEventListener("click", () => {
        choiceBtn.classList.contains("selected")
          ? choiceBtn.classList.remove("selected")
          : choiceBtn.classList.add("selected");
      });
      choicesContainer.appendChild(choiceBtn);
    }
  }

  const video = workbookContext.videoElement;

  const submitBtn = document.getElementById("submit-btn");
  submitBtn.addEventListener("click", () => {
    const quizModal = document.getElementById("quiz-modal");
    // 버튼이 클릭된 시점의 시간
    const clickTime = new Date().getTime();
    // 시간 차이 계산하여 solvedDuration으로 설정
    const solvedDuration = Math.floor((clickTime - popupTime) / 1000);
    const selectedChoiceId = getSelectedChoiceId(choicesContainer.childNodes);
    if (selectedChoiceId === null) {
      alert("답안을 선택해주세요.");
      return;
    }
    const isCorrect = isAnswer(selectedChoiceId, quizIdx);
    sendQuizResultAndRender(
      quiz.isSended,
      quizIdx,
      choicesContainer.childNodes,
      quizModal,
      video,
      solvedDuration,
      selectedChoiceId, // 선택한 답안의 ID도 함께 전달
      isCorrect // 정답 여부도 함께 전달
    );
    for (const choice of quiz.choices) {
      const choiceBtn = document.getElementById(`choice-${choice.choiceId}`);
      const iconElement = document.createElement("i");
      if (choice.isAnswer) {
        choiceBtn.classList.add("correct-answer");
        // 정답인 경우에는 'O' 표시를 추가
        iconElement.className = "bi bi-check-circle correct";
      } else if (!choice.isAnswer && selectedChoiceId === choice.choiceId) {
        choiceBtn.classList.add("wrong-answer");
        // 오답인 경우에는 'X' 표시를 추가
        iconElement.className = "bi bi-x-circle wrong";
      }
      choiceBtn.prepend(iconElement);
    }

    const modalContent = quizModal.querySelector(".modal-content");
    if (isCorrect) {
      modalContent.style.backgroundColor = "#5CFF42";
    } else {
      modalContent.style.backgroundColor = "#FF4242";
    }

  });
}

export function popupQuizEventHandler() {
  const video = workbookContext.videoElement;
  const quizzes = workbookContext.curQuizzes;
  const currentTime = video.currentTime;
  for (let i = 0; i < quizzes.length; i++) {
    const parsedTime = parseInt(currentTime);
    if (quizzes[i].isPopuped === false && parsedTime === quizzes[i].popupTime) {
      quizzes[i].isPopuped = true;
      popupQuiz(i);
      setTimeout(addPopupSideEffect, 500);
      video.pause();
    }
    if (parsedTime !== quizzes[i].popupTime) {
      quizzes[i].isPopuped = false;
    }
  }
}
