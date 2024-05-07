import io from 'socket.io-client';
import { showWakeUpModal } from '../alarm/wakeupmodal';

const SERVER_URL = 'http://localhost:4000';
let socket;
function connect() {
     socket = io(SERVER_URL, {
        autoConnect: true
    });

    socket.on('connect', () => {
        alert('소켓 연결이 되었습니다!');
        chrome.storage.local.get('authToken', function(data) {
            const authToken = data.authToken;
            socket.emit('sendData', { socketId: socket.id, token: authToken });
        });
    });

    socket.on('wakeup', (message) => {
        
        showWakeUpModal();
    });
    //졸음0, 자리이탈1
    



    return socket;
}

export { connect };

function disconnect(){
    socket.close();
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });

} export{disconnect};