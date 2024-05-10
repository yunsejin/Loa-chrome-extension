import { createAndPopupModalWithHTML } from '../modal/modal.js'; 

export function showLeaveSeatModal() {
    const modal = createAndPopupModalWithHTML({
        headerHTML : `
        <div class="modal-header">
            <p>자리이탈이 감지되었습니다.</p>
        </div>
        `,
        bodyHTML : `
        <div class="modal-body">
            <button id="dismissButton" style="background-color: #4CAF50; color: white; padding: 10px 20px; margin: 8px 0; border: none; border-radius: 4px; cursor: pointer; transition: transform 0.1s, width 0.3s ease-in-out; width: auto;">재개하기</button>
        </div>
        `
    });
    modal.id = "analysis-info-modal";
    const dismissButton = document.getElementById('dismissButton');
    dismissButton.onclick = function() {
        modal.remove();
    };
    dismissButton.onmouseover = function() {
        this.style.backgroundColor = '#45a049';
    };
    dismissButton.onmousedown = function() {
        this.style.transform = 'translate(2px, 2px)';
    };
    dismissButton.onmouseup = function() {
        this.style.transform = 'translate(0, 0)';
    };
}

document.addEventListener('DOMContentLoaded', function() {
    showLeaveSeatModal();
});