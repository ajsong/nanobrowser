const { remote, ipcRenderer, clipboard } = require('electron');
const { Menu, MenuItem } = remote;
const path = require('path');
const Store = require('electron-store');
const $ = jQuery = require('../../assets/jquery-3.4.1.min');
const coo = require('../../assets/coo');
let isMac = process.platform === 'darwin';
let store = new Store();

let currentPlatform = store.get('currentPlatform') || '';
if(currentPlatform.length){
	Object.defineProperty(navigator, 'platform', {
		get: function(){
			return currentPlatform;
		}
	});
}

if(!isMac){
	$('body').addClass('nonMac');
	ipcRenderer.send('devicePixelRatio', window.devicePixelRatio);
}

let strong = $('.view strong'), b = $('.view div b'), url = $('.view font input'), placeholder = $('.view font i'), webview = $('webview'), isMouseDown = false;
let updateUrl = (res) => {
	url.val(res);
	placeholder.html(res);
};

strong.html((isMac?'':'<i></i><i></i>') + remote.app.getName());
$('.view strong i:eq(0)').on('click', () => remote.getCurrentWindow().close());
$('.view strong i:eq(1)').on('click', () => remote.getCurrentWindow().minimize());

webview.attr('useragent', window.navigator.userAgent);
webview[0].addEventListener('did-finish-load', function(res){
	b.eq(2).removeClass('reload');
});
webview[0].addEventListener('did-navigate', function(res){
	if(res.url.indexOf('pages/index/start.html') === -1)updateUrl(res.url);
});
webview[0].addEventListener('did-fail-load', function(res){
	updateUrl(res.validatedUrl);
});
webview[0].addEventListener('did-navigate-in-page', function(res){
	updateUrl(res.url);
});

function setAutoHide(){
	$(document.body).on('mousedown', () =>{
		console.log('mousedown')
		isMouseDown = true;
	}).on('mouseup', () =>{
		console.log('mouseup')
		isMouseDown = false;
	}).on('mouseover', () => ipcRenderer.send('mouseover')).on('mouseleave', () =>{
		if(!isMouseDown)ipcRenderer.send('mouseleave');
	});
	strong.on('mouseup', () => ipcRenderer.send('windowMove'));
}
let autoHideSide = store.get('autoHideSide') || 0;
if(isMac && (typeof store.get('autoHideSide') === 'undefined' || autoHideSide === 1))setAutoHide();
ipcRenderer.on('setAutoHide', (e, arg) => {
	if(arg){
		setAutoHide();
	}else{
		$(document.body).off('mousedown').off('mouseup').off('mouseover').off('mouseleave');
		strong.off('mouseup');
	}
});

b.on('click', function(){
	let index = $(this).index();
	switch(index){
		case 0:webview[0].goBack();break;
		case 1:webview[0].goForward();break;
		case 2:webview[0].reload();break;
	}
});

url.on('keyup', function(e){
	let val = $(this).val();
	if(e.keyCode === 13){
		if(/^(?<!=(http|https):\/\/)[\w\-_]+(\.[\w\-_]+)+([\w\-.,@?^=%&:\/~+#]*[\w\-@?^=%&\/~+#])?$/.test(val))val = 'http://' + val;
		if(!/^https?:/.test(val))val = 'https://www.baidu.com/s?wd=' + val;
		b.eq(2).addClass('reload');
		//iframe.attr('src', val);
		webview.attr('src', val);
		$(this).blur();
	}else{
		if(val.length)placeholder.addClass('fill').html(val);
		else placeholder.removeClass('fill').html($(this).attr('placeholder'));
	}
}).on('blur', function(){
	url.hide();
	placeholder.show();
});

placeholder.on('mousedown', function(){
	placeholder.hide();
	url.show();
	setTimeout(() => {
		url.select().focus();
	}, 300);
});

ipcRenderer.on('copyHtml', (e, arg) => {
	webview[0].executeJavaScript('document.body.parentNode.outerHTML').then((res) => {
		clipboard.writeText(res);
		ipcRenderer.send('copyHtml');
	});
});

ipcRenderer.on('windowBlur', () => $(document.body).addClass('nonFocus'));
ipcRenderer.on('windowFocus', () => $(document.body).removeClass('nonFocus'));

ipcRenderer.on('message', (e, arg) => {
	if($.isPlainObject(arg)){
		if(arg.type === 'update-downloaded'){
			coo.overload(false);
			ipcRenderer.send('updateNow', { 'releaseNotes': arg.releaseNotes, 'releaseName': arg.releaseName });
		}else if(arg.type === 'update-not-available'){
			coo.overloadSuccess(arg.msg);
		}else if(arg.type === 'error'){
			console.log(arg.type, arg.msg);
			coo.overloadError(arg.msg);
		}else if(typeof arg.msg !== 'undefined'){
			coo.overload(arg.msg);
		}
	}else if(typeof arg === 'string'){
		coo.overload(arg);
	}else if(!arg){
		coo.overload(false);
	}
});

//初始化右键菜单
function initMenu(){
	let menu = new Menu();
	let copyMenu = new Menu();
	menu.append(new MenuItem({ label: '开发者工具', click() { remote.getCurrentWebContents().toggleDevTools() } }));
	menu.append(new MenuItem({ label: '复制HTML代码', click() {
		webview[0].executeJavaScript('document.body.parentNode.outerHTML').then((res) => {
			clipboard.writeText(res);
			ipcRenderer.send('copyHtml');
		});
	} }));
	copyMenu.append(new MenuItem({ label: '复制', role: 'copy' }));
	window.addEventListener('contextmenu', (e) => {
		e.preventDefault();
		if(isEleEditable(e.target)){
			menu.popup(remote.getCurrentWindow());
		}else{
			//判断有文本选中
			let selectText = window.getSelection().toString();
			if(!!selectText){
				copyMenu.popup(remote.getCurrentWindow());
			}
		}
	}, false);
}
//判断点击区域可编辑
function isEleEditable(e){
	if(!e)return false;
	if(e.tagName === 'BODY')return true;
	//为input标签或者contenteditable属性为true
	if(e.tagName === 'INPUT' || e.contentEditable === 'true'){
		return false;
	}else{
		//递归查询父节点
		return isEleEditable(e.parentNode)
	}
}
initMenu();