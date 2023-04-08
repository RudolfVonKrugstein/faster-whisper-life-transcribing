const start_button = document.getElementById('start')
const stop_button = document.getElementById('stop')
const output_div = document.getElementById('output')
start_button.disabled = false;
stop_button.disabled = true;

let websocket = null

// The stop button
stop_button.onclick = (e) => {
    close_all();
}

// Start the process
start_button.onclick = async () => {
    try {
        // Get the user media data
        const stream = await navigator.mediaDevices.getUserMedia(
            {
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    channelCount: 1
                },
            }
        )
        start_button.disabled = true;
        // Open the websocket connection
        websocket = new WebSocket("ws://" + window.location.hostname + ":8000/transcribe_life?lang=de")
        websocket.onopen = async (e) => {
            console.log("[open] Connection established");
            console.log("Sending to server");
            stop_button.disabled = false;
            await start_send(stream)
        };
        websocket.onmessage = on_receive
        websocket.onclose = function() {
            close_all()
            if (event.wasClean) {
                console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
            } else {
                // e.g. server process killed or network down
                // event.code is usually 1006 in this case
                alert('[close] Connection died');
            }
        };
        websocket.onerror = function(error) {
            close_all()
            alert(`[error]`);
        };

    } catch(err) {
        start_button.disabled = false;
        stop_button.disabled = true;
        alert(`The following getUserMedia error occurred: ${err}`);
    };
}


// Create the audio worklet to gain 16bit pcm at 16000 hz
let audioContext = null;
async function startPCMAudioProcessor(ws, stream) {
    if (!audioContext) {
        try {
            audioContext = new AudioContext({sampleRate: 16000});
            await audioContext.resume();
            await audioContext.audioWorklet.addModule("./js/pcm_websocket_processor.js")
        } catch(e) {
            alert(`Error during creation of audio process: ${e}`)
            return null
        }
    }
    let pcmws_node = new AudioWorkletNode(audioContext, "pcm-websocket");
    pcmws_node.port.onmessage = (e) => {
        websocket.send(e.data);
    }

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(pcmws_node);
    return pcmws_node;
}

function on_receive(event) {
    // Clear the output
    const output = document.getElementById("output")
    data = JSON.parse(event.data)
    out = `
                <div>Text: ${data['finished']}</div>
                <div>WIP: ${data['unfinished']['text']}</div>
                <table>
                `
    // Row of words
    out = `${out}<tr>`;
    for (word of data['unfinished']['words']) {
        out = `${out}<td>${word.text}</td>`
    }
    // Row of timings
    out = `${out}<tr>`;
    for (word of data['unfinished']['words']) {
        out = `${out}<td>${word.start_time.toFixed(2)}s - ${word.end_time.toFixed(2)}s</td>`
    }
    // Row of probability
    out = `${out}<tr>`;
    for (word of data['unfinished']['words']) {
        out = `${out}<td>${word.probability.toFixed(2)}</td>`
    }
    out = `${out}</tr>`;
    out = `${out}</table>`
    output.innerHTML = out
};

let pcmWsNode = null;
async function start_send(stream) {
    // Start sending via websocket
    pcmWsNode = await startPCMAudioProcessor(websocket, stream);
}

async function close_all() {
    if (pcmWsNode != null) {
        console.log("closing mediarecorder")
        pcmWsNode.recording = false;
        pcmWsNode.socket = null;
        pcmWsNode = null;
    }
    if (audioContext != null) {
        await audioContext.close();
        audioContext = null;
    }
    setTimeout(() => {
        if (websocket != null) {
            console.log("closing websocket")
            websocket.close();
            websocket = null;
        }
        start_button.disabled = false;
        stop_button.disabled = true;
    }, 40);
}


// var processor = null;
//
// let buffer = []
// let handlerInterval = null;
//
// function connect(start_send) {
//     let socket = new WebSocket("ws://" + window.location.hostname + ":8000/transcribe_life?lang=de");
//
//     socket.onopen = function(e) {
//         console.log("[open] Connection established");
//         console.log("Sending to server");
//         start_send(socket)
//     };
//
//     socket.onmessage = function(event) {
//         // Clear the output
//         const output = document.getElementById("output")
//         data = JSON.parse(event.data)
//         out = `
//             <div>Text: ${data['finished']}</div>
//             <div>WIP: ${data['unfinished']['text']}</div>
//             `
//         for (word of data['unfinished']['words']) {
//             out = `${out}
//                 <div>Word: ${word.text}\tStart: ${word.start_time}\tEnd: ${word.end_time}</div>
//                 `
//         }
//         output.innerHTML = out
//     };
//
//     socket.onclose = function(event) {
//         if (event.wasClean) {
//             alert(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
//         } else {
//             // e.g. server process killed or network down
//             // event.code is usually 1006 in this case
//             alert('[close] Connection died');
//         }
//     };
//
//     socket.onerror = function(error) {
//         alert(`[error]`);
//     };
// }
//
// function wsSender(ws) {
//     // 16000(sr) * 2(bytes) = 640 * 2(bytes) * (1000(millisecond) / 40(interval))
//     handlerInterval = setInterval(() => {
//         // audio package length 1280 bytes (640 * 2(bytes))
//         var audioData = buffer.splice(0, 640)
//         if (audioData.length > 0) {
//             ws.send(floatTo16BitPCM(audioData))
//         }
//     }, 20)  // must less than 40ms
// }
//
// function sendMessage(event) {
//     var input = document.getElementById("messageText")
//     ws.send(input.value)
//     input.value = ''
//     event.preventDefault()
// }
//
// counter = 0
// const handleSuccess = function (stream) {
//     const context = new AudioContext();
//     const source = context.createMediaStreamSource(stream);
//     // createScriptProcessor bufferSize = 0 means let Browser select the best size, e.g. 2048
//     processor = context.createScriptProcessor(0, 1, 1);
//
//     source.connect(processor);
//     processor.connect(context.destination);
//
//     processor.onaudioprocess = function (e) {
//         counter++
//         // Do something with the data, e.g. convert it to WAV
//
//         let sourceAudioBuffer = e.inputBuffer;
//
//         // `sourceAudioBuffer` is an AudioBuffer instance of the source audio
//         // at the original sample rate.
//         const DESIRED_SAMPLE_RATE = 16000;
//         const offlineCtx = new OfflineAudioContext(sourceAudioBuffer.numberOfChannels, sourceAudioBuffer.duration * DESIRED_SAMPLE_RATE, DESIRED_SAMPLE_RATE);
//         const cloneBuffer = offlineCtx.createBuffer(sourceAudioBuffer.numberOfChannels, sourceAudioBuffer.length, sourceAudioBuffer.sampleRate);
//         // Copy the source data into the offline AudioBuffer
//         for (let channel = 0; channel < sourceAudioBuffer.numberOfChannels; channel++) {
//             cloneBuffer.copyToChannel(sourceAudioBuffer.getChannelData(channel), channel);
//         }
//         // Play it from the beginning.
//         const source = offlineCtx.createBufferSource();
//         source.buffer = cloneBuffer;
//         source.connect(offlineCtx.destination);
//         offlineCtx.oncomplete = function (e) {
//             // `resampledAudioBuffer` contains an AudioBuffer resampled at 16000Hz.
//             // use resampled.getChannelData(x) to get an Float32Array for channel x.
//             const resampledAudioBuffer = e.renderedBuffer;
//             // convert to  int16 buffer array
//             buffer.push(...resampledAudioBuffer.getChannelData(0))
//         }
//         offlineCtx.startRendering();
//         source.start(0);
//     };
// };
//
// document.getElementById('start').addEventListener('click', function () {
//     document.getElementById("start").disabled = true;
//     connect((ws)=>{
//         if (ws == null) {
//             return // alert already shown
//         }
//         navigator.mediaDevices.getUserMedia({
//             audio: {channelCount: 1, sampleRate: 16000},
//             video: false
//         })
//             .then(handleSuccess);
//
//
//         setTimeout(() => {
//             wsSender(ws)
//         }, 40)
//
//         document.getElementById('stop').addEventListener('click', function() {
//             if (null != ws) {
//                 ws.close();
//             }
//             console.log('disconnect');
//             if (null != handlerInterval) {
//                 console.log('cleared intrerval');
//                 clearInterval(handlerInterval)
//             }
//             document.getElementById("start").disabled = false;
//             document.getElementById("stop").disabled = true;
//         })
//         document.getElementById("stop").disabled = false;
//
//         console.log('record time ' + new Date().getTime() / 1000)
//         console.log('record');
//     });
// });
//
