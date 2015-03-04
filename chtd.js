//TODO: Add sockjs support
Chtd = function(wsHost, userInput, commonOutput) 
{
                
    this.wsHost = wsHost;
    this.userInput = userInput;
    this.commonOutput = commonOutput;
    var webSocket = null;
    var connected = false;
    var smilesContainer = null;
    this.strategy = null;
                
    function initElements () 
    {
        disableUserInput();
        showLoadingWindow();
    }
                
    function disableUserInput() 
    {
        userInput.setAttribute('disabled', 'disabled');
    }
    
    function enableUserInput() 
    {
        userInput.removeAttribute('disabled');
    }
    
    function emptyUserInput() 
    {
            userInput.value="";        
    }
    
    function hideSmilesContainer() 
    {
        if (smilesContainer) {
            smilesContainer.style.display = 'none';
        }
    }
    
    function placeSmilesContainer(e) 
    {
            smilesContainer.style.left = e.clientX;
            smilesContainer.style.top = e.clientY;
            smilesContainer.style.display = 'block';
    }
    
    function showWelcomeBar() 
    {
        var welcomeBar = document.getElementById('welcomeBar');
        if (welcomeBar)
            welcomeBar.style.display = "block";
    }
    function hideWelcomeBar() 
    {
        var welcomeBar = document.getElementById('welcomeBar');
        if (welcomeBar)
            welcomeBar.style.display = "none";
    }
    
    chtdKeypressHandler = function(e) 
    {
        var code = e.charCode || e.keyCode;
        //remove f-keys
        if (e.keyCode > 111 > e.charCode && 124 > e.keyCode > e.charCode) {
            return false;
        }
        //firefox gets 8 for keyCode, Chrome - ignores                                
        if (code != 8) {
            //removeLastSmile();
            webSocket.send('{"type": 1, "keyCode":' + code + '}');
        }
    }
    
    chtdKeydownHandler = function(e) 
    {
        var code = e.charCode || e.keyCode;
        //block delete, left-arrow
		if (code == 46 || code == 37) {
            e.preventDefault();
            return false;
        }
        //delete key
		if (code == 8) {
            resetSelection(e.target);
            removeLastSmile();
            webSocket.send('{"type": 1, "keyCode":' + code + '}');
        }
    }
    
    chtdClickHandler = function(e) 
    {
        hideSmilesContainer();
    }
    
    smlClickHandler = function(e) 
    {
        var e = e || event;
        var cClass = e.target.getAttribute('class');
        var arrClass = cClass.split(' ');
        if(arrClass[1]) {
            userInput.value += ":" + arrClass[1] + ":";
            webSocket.send('{"type": 5, "smileCode": "' + arrClass[1] + '"}');
            smilesContainer.style.display = 'none';
            userInput.focus();
        }
    }
    smlBlurHandler = function(e) 
    {
        hideSmilesContainer();
    }
    
    smlContextMenuHandler = function(e) 
    {
        var e = e || event;
        e.preventDefault() || (e.returnValue = false);   
    }
    chtdContextMenuHandler = function(e) 
    {
        var e = e || event;
        e.preventDefault() || (e.returnValue = false);
        if (smilesContainer) {
            placeSmilesContainer(e);
        } else {
            smilesContainer = retrieveSmileDiv(e);
            //add Smiles handlers
            smilesContainer.addEventListener('click', smlClickHandler);
            smilesContainer.addEventListener('blur', smlBlurHandler);
            smilesContainer.addEventListener('contextmenu', smlContextMenuHandler);
        }
    }
    chtdOnSelectionHandler = function(e) 
    {
        resetSelection(e.target);
    }
    function initEvents() 
    {
        if (connected) 
        {
            if (!userInput) return;
            //userinput Events
            userInput.addEventListener('keypress', chtdKeypressHandler);
            userInput.addEventListener('keydown', chtdKeydownHandler);
            userInput.addEventListener('contextmenu', chtdContextMenuHandler);
            //document Events
            document.body.addEventListener('click', chtdClickHandler);
            document.addEventListener('mousedown', chtdOnSelectionHandler);
            document.addEventListener('mouseup', chtdOnSelectionHandler);
        }
    }
    
    function setStrategy(strategy) 
    {
        this.strategy = strategy;
    }
    
    function Message(dataObj) 
    {
        this.data = {
            
        };
        this.process = function() 
        {

        };
    }
    
    function UserMessage(dataObj) 
    {
        var message = new Message(dataObj);
        this.data = {
            userId: dataObj.rId,
            output: commonOutput,
            input: userInput,
            userName: dataObj.name,
            nodeType: 'text',
            value: ''
        };
        return {
            data : this.data ,
            process : function() {
                message.process();
                SUDMessage(this.data);
            }
        }
    }
    
    function AgentUserMessage(dataObj) 
    {
        var userMessage = new UserMessage(dataObj);
        userMessage.data.value = dataObj.agentMsg;
        return userMessage;
        
    }
    
    function CharUserMessage(dataObj) 
    {
        var userMessage = new UserMessage(dataObj);
        userMessage.data.nodeType = 'char';
        userMessage.data.value = dataObj.keyCode;
        return userMessage;        
    }
    
    function SmileUserMessage(dataObj) 
    {
        var userMessage = new UserMessage(dataObj);
        userMessage.data.value = dataObj.smileCode;
        userMessage.data.nodeType = 'smile';
        return userMessage;
        
    }
    
    function SystemMessage(dataObj) 
    {
        var message = new Message(dataObj);
        return {
            data: { partial: ''},
            process : function() {
                message.process();
                showSystemMessage(commonOutput, dataObj.name +  " " + this.data.partial);                
            }
        }
    }
    
    function ConnectSystemMessage(dataObj) 
    {
        var message = new SystemMessage(dataObj);
        message.data.partial = "connected.";
        return message;
    }
    function DisconnectSystemMessage(dataObj) 
    {
        var message = new SystemMessage(dataObj);
        message.data.partial = "disconnected.";
        return message;
    }
    
    function getStrategyByObject(dataObj) 
    {
        
        if (!dataObj instanceof Object || !dataObj.type)
            return null;
        
        switch (dataObj.type)
        {
            case 1:
                return CharUserMessage(dataObj);
                break;
            case 2:
                return ConnectSystemMessage(dataObj);
                break;
            case 3:
                return DisconnectSystemMessage(dataObj);
                break;
            case 4:
                return AgentUserMessage(dataObj);
                break;
            case 5:
                return SmileUserMessage(dataObj);
                break;
            default:
                return null;
        }
    }
    
    function messageHandle(dataObj) 
    {
        if (!dataObj instanceof Object || !dataObj.type) 
            return false;

        setStrategy(getStrategyByObject(dataObj));
        return this.strategy.process();
        
    }
    run = function() 
    { 
        initElements();

        if ("WebSocket" in window) 
        {

            webSocket = new WebSocket(wsHost);
            webSocket.onopen = function(event) 
            {
                connected = true;
                closeLoadingWindow();
                showWelcomeBar();
                            
                initEvents();
                
                enableUserInput();
                emptyUserInput();
                
            };

            webSocket.onmessage = function(event) 
            {
                var dataObj = JSON.parse(event.data);
                var result = messageHandle(dataObj);
            };

            webSocket.onclose = function(event) 
            {                        
                if (connected) 
                {
                    showLoadingWindow('Disconnected.');
                    setTimeout(closeLoadingWindow,2000);
                } else 
                {
                    closeLoadingWindow();
                    showLoadingWindow('Couldn\'t connect to server.');
                    setTimeout(closeLoadingWindow,2000);
                }
            };

            webSocket.onerror = function(event) 
            {
                if (event.currentTarget.readyState == 3) 
                {
                    //console.log('Connection closed. Couldn\'t connect to server')
                }
            };

        } else {
            alert('Unsupported browser!');
        }
    }
    
    run();
};

