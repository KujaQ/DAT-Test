/** Singleton Class */

var SphinxClass = (function () {
    /** Singleton instance*/
    var instance = null;

    /** private constructor*/
        this.session = null;
        this.response = null;
        this.target = null;
        this.cid = null;
        this.activ = null;
        this.page = null;
        this.destination = null;

        this.parentNode = null;
        this.iFrameStyleClass = null;
        this.signature = null;
        this.servletmapping = null;
        this.error = null;
        this.externalUrl = null;
        this.useSafariCookieApi = false;

        var msgListener = function (msg) {
            if (msg != null && msg.data != null) {
                if (msg.data === 'logout') {
                    if (typeof that.onLogout === 'function') {
                        clearInterval(sphinx.lougoutInterval);
                        that.onLogout(msg.data);
                    }
                }
                // In case of Safari we can recieve this message to open the integration
                else if (msg.data === 'openIntegration' || msg.data.type === 'openIntegration') {
                    that.onOpenIntegrationMessage();
                }
                // the "message" member is used for redirect URLs (probably some historic thing...)
                else if (msg.data.type == null && msg.data.message != null) {
                    that.onRedirectMessage(msg);
                }
                // other message data is forwarded to the user's handler (TODO - add some filters?)
                else if (that.onMessage != null) {
                    that.onMessage(msg);
                }
            } /* else {
                    console.log("received empty message");
                } */
        };

        // Add a post message handler in order to receive messages from the iframe
        var that = this;
        if (window.postMessage) {
            // W3C Cross Site Scripting
            if (window.addEventListener) {
                // W3C default
                window.addEventListener('message', msgListener, false);
                // For some weird exceptions like Safari...
                window.addEventListener('onmessage', msgListener, false);
            }
            // Internet Explorer before 11
            else if (window.attachEvent) {
                window.attachEvent('onmessage', msgListener);
            }
            // Browser does not support messages. We should show an error message...
        }
    }

    /** Public Event Handler */

    /** Callback invoked, as soon as the user clicks the finish button on the last page */
    Sphinx.prototype.onSuccess = null;
    /** Called in case of any error */
    Sphinx.prototype.onError = null;

    Sphinx.prototype.onMessage = null;
    Sphinx.prototype.onLogout = null;
    /** Public Properties */

    /** An url with external styles which should be applied to the page */
    Sphinx.prototype.style = null;
    /** The first page within the navigation */
    Sphinx.prototype.firstPage = '';
    /** The last page within the navigation */
    Sphinx.prototype.lastPage = '';


    /** Public Constants and default values */
    Sphinx.prototype.host = 'http://datws459:8080';
    Sphinx.prototype.iFrameId = "sphinx.iFrame";
    Sphinx.prototype.safariCookiesUrl = "https://www.dat.de/fileadmin/media/sphinx/iFrame_Integration/index.html";
    Sphinx.prototype.useSafariCookieApi = false;
    Sphinx.prototype.externalUrl = null;

    /** Private Methods */
    /**
     * The Session id is passed as http only which means we can not access it from
     * Javascript. But we can overwrite/overlay it.
     *
     * Thus we set the JSESSIONID to something expired. But the path has to be an exact match
     * otherwise the overlay does not work as expected.
     */
    Sphinx.prototype._clearCookie = function () {

        if (!sphinx.host)
            return;

        var parser = document.createElement('a');
        parser.href = sphinx.host;

        var pathname = parser.pathname;

        // IE returns the path without a leading slash.
        if (pathname[0] != "/")
            pathname = "/" + pathname;

        try {
            document.cookie = "JSESSIONID=;expires=Thu, 01 Jan 1970 00:00:00 GMT;SameSite=None;Secure;HttpOnly;domain=" + parser.hostname + ";path=" + pathname + ";";
        } catch (err) { }

        try {
            document.cookie = "JSESSIONID=;expires=Thu, 01 Jan 1970 00:00:00 GMT;SameSite=None;Secure;HttpOnly;path=" + pathname + ";";
        } catch (err) { }
    }

    /** the init method */
    Sphinx.prototype.init = function (page, destination, parentNode, iFrameStyleClass, style, target) {

        this._clearCookie();

        //only VRO
        if (page && (page.indexOf('VehicleRepairOnline') != -1 || page.indexOf('CalculateExpert') != -1)) {
            page = page.replace('model.html', 'model.htm').replace('/vehicleSelection/model.htm', '/w/vehicleSelection/model.htm');
        }
        // only Grapa, new Endpoint URL since 08.2016
        if (page && (page.indexOf('/grapaselservice/GraphicalPartSelectionPage.html') != -1)) {
            page = page.replace('/grapaselservice/GraphicalPartSelectionPage.html', '/vehicleRepair/graphicalPartSelectionPage.tmpl');
        }


        this.page = page;
        this.destination = destination;

        // The parent node can be either a string...
        if (typeof (parentNode) === "string")
            parentNode = document.getElementById(parentNode);

        // ... or an dom object. But it hat to exists. Otherwise
        // there is no place where to put the iframe.
        if (!parentNode)
            throw "No parent node specified";

        this.parentNode = parentNode;
        this.iFrameStyleClass = iFrameStyleClass;
        this.servletmapping = 'external';
        this.style = style;
        this.target = target;
    };

    Sphinx.prototype.getXMLHttpRequest = function () {
        if (window.XMLHttpRequest) {
            return new XMLHttpRequest();
        } else if (window.ActiveXObject) {
            try {
                return new ActiveXObject("Msxml.XMLHTTP");
            } catch (err) { }
            try {
                return new ActiveXObject("Microsoft.XMLHTTP");
            } catch (err) { }
        }
        throw new Error("Can not create the object XMLHttpRequest for the browser");
    };

    /** this method is called after the inclusion of
     * a script node with a callback parameter sphinx.setCId
     */
    Sphinx.prototype.setCId = function (jsonData) {
        this.error = jsonData.error;
        this.session = jsonData.session;
        if (jsonData.cid) {
            this.cid = jsonData.cid;
        }
        if (jsonData.signature) {
            this.signature = jsonData["signature"];
        }

        if (jsonData.redirect) {
            this.page = this.host + jsonData.redirect;
        }
    };

    /** generates a XMLHttpRequest and sends the data
     * @params 	url is the complete url without parameter
     * 			data is url part stating with '?'
     *			method GET or POST (default)
     */
    Sphinx.prototype.sendRequest = function (url, data, method) {
        if (!method) method = 'POST';
        var script = this.getXMLHttpRequest();

        script.open(method, url, false);

        var header = 'Content-Type:application/x-www-form-urlencoded; charset=UTF-8';
        script.setRequestHeader(header.split(':')[0], header.split(':')[1]);
        script.send(data);
        return script;
    };

    /** includes a js file via XMLHttpRequest*/
    Sphinx.prototype.include_js = function (file) {
        var script = this.sendRequest(file, null, 'GET');
        if (script.status == 200) {
            if (window.execScript)
                window.execScript(script.responseText);
            else window.eval(script.responseText);
        }
    };

    /** encrypts the password with AES encription
     * @params param must be a callback which returns
     *                 a DatLoginInformation object
     *                or a DatLoginInformation
     */
    Sphinx.prototype.encryptPassword = function (param) {
        var val;
        if (typeof (param) == 'function') {
            val = param();
        } else val = param;
        //TODO implement AES encoding
        /*if(typeof Cipher != 'function'){
         this.include_js('js/aes.js', this.encryptPasswordCb, val);
         }
         var key = val.customerNumber+':'+ val.login;
         if(key.length > 16) key = key.substring(0,16);
         val.password=AESEncryptCtr(val.password, key, 256);*/
        return val;
    };

    /**
     *    @params     className style class name
     *                parent    the parent element, default is document
     *                tagname the tag names of searched elements (optional)
     *    @returns an array of elemens with given style class
     */
    Sphinx.prototype.getElementsByStyleClass = function (className, parent, tagname) {
        parent = parent ? parent : document;
        if (parent.getElementsByClassName) {
            return parent.getElementsByClassName(className);
        } else {
            tagname = tagname ? tagname : '*';
            var all = parent.getElementsByTagName(tagname);
            var elements = new Array();
            for (var e = 0; e < all.length; e++) {
                if (all[e].className == className) {
                    elements[elements.length] = all[e];
                }
            }
            return elements;
        }
    };

    /** generates a new iframe pointing at src */
    Sphinx.prototype.generateIframe = function (src, params) {
        var iframe = document.createElement("iframe");
        iframe.setAttribute("id", this.iFrameId);
        iframe.setAttribute("name", this.iFrameId);
        iframe.setAttribute("src", src + "?" + params);
        iframe.setAttribute("frameBorder", "0");
        iframe.setAttribute("allowfullscreen", "allowfullscreen");
        iframe.className = this.iFrameStyleClass;
        this.parentNode.appendChild(iframe);

    };

    /** this method is called after the inclusion of
     * a script node with a callback parameter sphinx.getData
     */
    Sphinx.prototype.getData = function (xml) {
        if (!this.onSuccess)
            callbackFromSphinx(this, xml);

        if (typeof this.onSuccess === 'function') {
            this.onSuccess(this, xml);
        }
    };

    /**
     * Older IEs do not implement the origin attribute.
     */
    Sphinx.prototype._getOrigin = function (location) {

        var origin = location.origin;

        if (origin)
            return origin;

        return location.protocol + "//" + location.hostname + (location.port ? ':' + location.port : '');
    };

    /**
     * This is an internal method
     */
    Sphinx.prototype.onOpenIntegrationMessage = function (msg) {
        var that = this;
        sphinx.deleteIframe();
        LazyLoad.js(sphinx.externalUrl, function () { that.cidCallBack(); }, this, true);
    }

    Sphinx.prototype.onRedirectMessage = function (msg) {

        // An "a" element is the fastes and most reliant url parser.
        // we need to parse first the sphinx host and extract the origion
        var parser = document.createElement('a');
        parser.href = sphinx.host;

        var origin = this._getOrigin(parser);

        var parser2 = document.createElement('a');
        parser2.href = msg.origin;

        // Check for cross site scripting attacs, yes we have to do this...
        if ((parser.protocol != parser2.protocol) || (parser.hostname !== parser2.hostname)) {

            if (sphinx.onError)
                sphinx.onError("Cross Site Scripting fault " + parser.protocol + " " + parser2.protocol + " | " + parser.hostname + " " + parser2.hostname);

            return;
        }

        // then continue parsing the message.
        parser.href = msg.data.message;

        // An non default ready handler needs a hard reload. Due to xss constraints we need to emulate it.
        var currentOrigin = this._getOrigin(window.location);
        if ((currentOrigin != origin) || (window.pathname != parser.pathname)) {
            window.location.replace(msg.data.message);
            return;
        }


        var result = sphinx._parseHash(parser.hash);

        window.location.hash = "";

        if (result)
            sphinx.requestResult(result.az, result.cid);
    };

    Sphinx.prototype._parseHash = function (hash) {

        hash = hash.replace('#', '').split('~');

        if (hash.length != 2)
            return null;

        var result = {};
        result.az = hash[0].split('_')[1];
        result.cid = hash[1].split('_')[1];

        return result;
    };

    Sphinx.prototype.requestResult = function (az, cid) {
        window.location.hash = "ready=" + az;
        LazyLoad.js(sphinx.host + '/post.' + sphinx.servletmapping + '?cid=' + cid + '&az=' + az + '&destination=' + sphinx.destination + '&callback=sphinx.getData', sphinx.navigateToTarget, sphinx, true);
    }

    /** this method checks for the hash messages in the parent url.
     *    It is the only possibility for communication between
     *    frames pointing at different domains.
     *    <b>Important</b>: use 'sphinx' instead of 'this'
     *                     this function runs in window contenxt!
     */
    Sphinx.prototype.checkForMessages = function () {

        if (window.location.hash.indexOf('ready_') > -1) {
            window.clearInterval(sphinx.activ);

            var result = sphinx._parseHash(window.location.hash);

            window.location.hash = "";

            if (result)
                sphinx.requestResult(result.az, result.cid);

            sphinx.activ = window.setInterval(function () { sphinx.checkForMessages() }, 500);

        } else if (window.location.hash.indexOf('ready') > -1 && window.location.hash.indexOf('ready=') < 0) {
            window.clearInterval(sphinx.activ);
            document.cookie = "JSESSIONID=" + sphinx.session;
            LazyLoad.js(sphinx.host + '/post.' + sphinx.servletmapping + '?' + sphinx.cid + '&destination=' + sphinx.destination + '&callback=sphinx.getData', sphinx.navigateToTarget, sphinx, true);
            document.cookie = "JSESSIONID=;expires=" + new Date();
        }
    };

    /** drops the iframe */
    Sphinx.prototype.deleteIframe = function () {
        var iframe = document.getElementById(this.iFrameId);
        var parent = iframe.parentNode;
        parent.removeChild(iframe);
    };

    /** the callback after getting the cid from the server */
    Sphinx.prototype.cidCallBack = function () {
        if (sphinx.cid) {
            sphinx.activ = window.setInterval(sphinx.checkForMessages, 500);
            var params = sphinx.cid;
            if (sphinx.productVariant) {
                var productVariant = sphinx.productVariant;
                if (productVariant == 'calculatePro') {
                    productVariant = 'fiOnline';
                }
                params += '&DAT-ProductVariant=' + productVariant;
                params += '&productVariant=' + productVariant;
            }
            sphinx.generateIframe(sphinx.page, params);
            if (typeof sphinx.onLogout === 'function') {
                sphinx.lougoutInterval = setInterval(function () {
                    var iFrame = document.getElementById(sphinx.iFrameId);
                    if (iFrame) {
                        iFrame.contentWindow.postMessage('setLogout;' + location.origin, sphinx.host);
                    }
                }, 10000);
            }
        } else if (sphinx.onError) {
            sphinx.onError(sphinx.error ? sphinx.error : "Anmeldung nicht erfolgreich. Bitte überprüfen Sie Ihre Eingabe.");
        }
    };

    /**
     * Gets the cid from the server
     * NOTE: Using the error handler is deprecated, use the onError property instead.
     */
    Sphinx.prototype.execute = function (login, DAF, errorHandler) {

        if (errorHandler) {
            this.onError = errorHandler;
        }

        if (typeof login == 'function') {
            login = this.encryptPassword(login);
        }
        if (typeof DAF != 'string') {
            DAF = this.getDAFJson(DAF);
        }
        var style = '';
        if (this.style) style = '&style=' + this.style;

        var productVariantParam = "";
        var that = this;
        // map productVariant to legacy value, but not in this... because this belongs to caller.
        if (that.productVariant == 'calculatePro') {
            that.productVariant = 'fiOnline';
        }
        if (that.productVariant) {
            productVariantParam = '&productVariant=' + that.productVariant;
            productVariantParam += '&DAT-ProductVariant=' + that.productVariant;
        }

        sphinx.externalUrl = sphinx.host + '/post.' + sphinx.servletmapping + '?' + login.toParamString() + '&DAF=' + DAF + '&firstPage=' + this.firstPage + '&lastPage=' + this.lastPage + productVariantParam +
            '&destination=' + this.destination + style + '&clientLocation=' + encodeURIComponent(location) + '&callback=sphinx.setCId'

        // In case of useSafariCookieApi & safari browser, first open cookies solution
        if (!sphinx.useSafariCookieApi || !/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
            LazyLoad.js(sphinx.externalUrl, function () { that.cidCallBack(); }, this, true);
        } else {
            sphinx.generateIframe(sphinx.safariCookiesUrl, "");
        }
    };

    /** converts an associative array to xml */
    Sphinx.prototype.getDAFXml = function (params) {
        var res = '';
        if (typeof params == 'object') {
            res += '<?xml version="1.0" ?><data>';
            res += this.getDAFXmlRec(params);
            res += '</data>';
        }
        return res;
    };

    Sphinx.prototype.getDAFXmlRec = function (params) {
        var key;
        var res = '';
        for (key in params) {

            if (params[key] == null)
                continue;

            res += '<' + key + '>';
            if (typeof params[key] == 'object') {
                res += this.getDAFXmlRec(params[key]);
            } else {
                res += params[key];
            }
            res += '</' + key + '>';
        }
        return res;
    };

    /** converts an assosiative array to json */
    Sphinx.prototype.getDAFJson = function (params) {
        if (typeof params == 'object')
            return '';

        return JSON.stringify(params);
    };

    Sphinx.prototype.invalidate = function () {
        if (!this.session)
            return;

        var xmlhttp = this.getXMLHttpRequest();
        xmlhttp.open("POST", this.host + "/sessionKill", true);

        xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xmlhttp.send("sessionId=" + this.session);
    };

    /** navigates to the target set before */
    Sphinx.prototype.navigateToTarget = function () {
        var scrs = sphinx.getElementsByStyleClass('SphinxScript');
        for (var i = 0; i < scrs.length; i++)scrs[i].parentNode.removeChild(scrs[i]);

        var iFrame = document.getElementById(this.iFrameId);
        if (iFrame) {
            if (this.response) {
                if (this.target) {
                    if (typeof this.target == 'function') {
                        target(this.response);
                    } else {
                        var form = iFrame.forms[0];
                        iFrame.setAttribute("src", '');
                        form.action.value = target;
                        form.method = 'post';
                        var hidden = document.createElement("input");
                        hidden.setAttribute("name", "sphinx.data");
                        hidden.setAttribute("value", this.response);
                        form.appendChild(hidden);
                        form.submit();
                    }
                } else {
                    this.deleteIframe();
                    this.generateIframe('', '');
                    iFrame = document.getElementById(this.iFrameId);
                    iFrame.doc = null;
                    if (iFrame.contentDocument)
                        // Firefox, Opera
                        iFrame.doc = iFrame.contentDocument;
                    else if (iFrame.contentWindow)
                        // Internet Explorer
                        iFrame.doc = iFrame.contentWindow.document;
                    else if (iFrame.document)
                        // Others?
                        iFrame.doc = iFrame.document;
                    // If we did not succeed in finding the document then throw an exception
                    if (iFrame.doc == null)
                        throw "Document not found, append the parent element to the DOM before creating the IFrame";
                    iFrame.doc.open();
                    iFrame.doc.close();
                    var p = iFrame.doc.createElement("p");
                    p.setAttribute("id", "tId");
                    var textNode = iFrame.doc.createTextNode(this.response);
                    p.appendChild(textNode);
                    iFrame.doc.body.appendChild(p);
                }
            }
        }
    };

    return new function () {
        this.getInstance = function () {
            if (instance == null) {
                instance = new Sphinx();
                instance.constructor = null;
            }
            return instance;
        }
    };
}

)();


/** Singleton instance*/
var sphinx = SphinxClass.getInstance();

/** class holding the DAT login information*/
function DatLoginInformation(customerNumber, login, password) {
    this.customerNumber = customerNumber;
    this.login = login;
    this.password = password;
}
DatLoginInformation.prototype.toParamString = function () {
    return 'custNumber=' + this.customerNumber + '&login=' + this.login + '&pwd=' + this.password;
};

function DatSignatureInformation(signature, customerNumber, login) {
    this.signature = signature;
    this.customerNumber = customerNumber;
    this.login = login;
}

DatSignatureInformation.prototype.toParamString = function () {
    return 'signature=' + this.signature + '&custNumber=' + this.customerNumber + '&login=' + this.login;
}

function DatTokenInformation(token) {
    this.token = token;
}

DatTokenInformation.prototype.toParamString = function () {
    return 'DAT-AuthorizationToken=' + this.token;
}