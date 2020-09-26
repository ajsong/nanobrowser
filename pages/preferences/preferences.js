const { remote, ipcRenderer } = require('electron');
const Store = require('electron-store');
const $ = jQuery = require('../../assets/jquery-3.4.1.min');
let store = new Store();
let isMac = process.platform === 'darwin';

if(!isMac)$('body').addClass('nonMac');
$('h1').html((isMac?'':'<i></i>') + remote.getCurrentWindow().getTitle());
$('h1 i').on('click', () => remote.getCurrentWindow().close());
$(document.body).on('keydown', function(e){
	if(e.keyCode === 27){
		remote.getCurrentWindow().close();
	}
});

let platform = store.get('currentPlatform') || window.navigator.platform;
let platformList = $('.platform-list'), input = $('.platform input'), hasPlatform = false;
platformList.on('change', function(){
	if(!this.value.length){
		store.delete('currentPlatform');
		input.val('');
		return;
	}
	input.val(this.value);
	store.set('currentPlatform', this.value);
}).find('option').each(function(){
	if($(this).val().indexOf(platform) > -1){
		$(this).prop('selected', true);
		hasPlatform = true;
		return false;
	}
});
if(!hasPlatform)platformList.append('<option value="'+platform+'" selected>自定义平台</option>');
input.val(platform).on('keyup', function(){
	let val = $(this).val();
	if(!val.length)return;
	store.set('currentPlatform', val);
});

let userAgent = store.get('currentUserAgent') || window.navigator.userAgent;
userAgent = userAgent.replace(/[\n\r]/g, '');
let userAgentList = $('.useragent-list'), textarea = $('.useragent textarea'), hasUserAgent = false;
userAgentList.on('change', function(){
	if(!this.value.length){
		store.delete('currentUserAgent');
		textarea.val('');
		return;
	}
	textarea.val(this.value);
	store.set('currentUserAgent', this.value);
}).find('option').each(function(){
	if($(this).val() === userAgent){
		$(this).prop('selected', true);
		hasUserAgent = true;
		return false;
	}
});
if(!hasUserAgent && userAgent !== window.navigator.userAgent)userAgentList.append('<option value="'+userAgent+'" selected>自定义代理</option>');
textarea.val(userAgent).on('keyup', function(){
	let val = $(this).val().replace(/[\n\r]/g, '');
	if(!val.length)return;
	store.set('currentUserAgent', val);
});

let size = store.get('currentWindowSize') || '';
let sizeList = $('.size-list'), width = $('.width'), height = $('.height'), hasSize = false;
sizeList.on('change', function(){
	if(!this.value.length){
		store.delete('currentWindowSize');
		width.val('');
		height.val('');
		return;
	}
	store.set('currentWindowSize', this.value);
	ipcRenderer.send('setWindowSize', this.value);
	let s = this.value.split('*');
	width.val(s[0]);
	height.val(s[1]);
}).find('option').each(function(){
	if($(this).val() === size){
		$(this).prop('selected', true);
		hasSize = true;
		return false;
	}
});
if(!hasSize && size !== '320*568')sizeList.append('<option value="'+width.val()+'*'+height.val()+'" selected>自定义大小</option>');
ipcRenderer.send('getWindowSize');
ipcRenderer.on('getWindowSize', (e, arg) => {
	width.val(arg[0]);
	height.val(arg[1]);
});
width.on('blur', function(){
	let widthVal = $(this).val(), heightVal = height.val();
	if(!/^\d+$/.test(widthVal) || !/^\d+$/.test(heightVal))return;
	store.set('currentWindowSize', widthVal+'*'+heightVal);
	ipcRenderer.send('setWindowSize', widthVal+'*'+heightVal);
});
height.on('blur', function(){
	let widthVal = width.val(), heightVal = $(this).val();
	if(!/^\d+$/.test(widthVal) || !/^\d+$/.test(heightVal))return;
	store.set('currentWindowSize', widthVal+'*'+heightVal);
	ipcRenderer.send('setWindowSize', widthVal+'*'+heightVal);
});

/*HTML5 Notification API
let notification = new Notification('Title', { body: 'Lorem Ipsum Dolor Sit Amet' });
notification.onclick = () => {
	console.log('Notification clicked');
}*/

let openLogin = $('.openLogin').on('click', function(){
	ipcRenderer.send('openLogin', this.checked);
	if(this.checked){
		new Notification(remote.app.name, { body: '设置开机自启' });
	}else{
		new Notification(remote.app.name, { body: '取消开机自启' });
	}
});
openLogin.prop('checked', remote.app.getLoginItemSettings().openAtLogin);

let alwaysTop = $('.alwaysTop').on('click', function(){
	ipcRenderer.send('alwaysOnTop', this.checked);
	if(this.checked){
		store.set('alwaysOnTop', 1);
		new Notification(remote.app.name, { body: '设置置顶成功' });
	}else{
		store.delete('alwaysOnTop');
		new Notification(remote.app.name, { body: '取消置顶成功' });
	}
});
let alwaysOnTop = store.get('alwaysOnTop');
if(!!alwaysOnTop)alwaysTop.prop('checked', true);

let devTools = $('.devTools').on('click', function(){
	if(this.checked){
		store.set('defaultOpenDevTools', 1);
		new Notification(remote.app.name, { body: '设置默认启动开发者工具' });
	}else{
		store.delete('defaultOpenDevTools');
		new Notification(remote.app.name, { body: '取消默认启动开发者工具' });
	}
});
let defaultOpenDevTools = store.get('defaultOpenDevTools');
if(!!defaultOpenDevTools)devTools.prop('checked', true);

let dark = $('.dark').on('click', function(){
	ipcRenderer.send('useDarkColors', this.checked);
	if(this.checked){
		store.set('useDarkColors', 1);
	}else{
		store.delete('useDarkColors');
	}
});
let useDarkColors = store.get('useDarkColors');
if(!!useDarkColors)dark.prop('checked', true);

$('.relaunch').on('click', () => {
	remote.app.relaunch();
	remote.app.quit();
});

/*
$('.close').on('click', () => {
	remote.getCurrentWindow().close();
});
*/

$('.about strong').html(remote.app.getName());
$('.about span').html('当前版本：' + remote.app.getVersion());

$('.tabs-view .li').eq($('.tabs-header .this').index()).removeClass('hidden');
$('.tabs-header .li').on('click', function(){
	$(this).addClass('this').siblings().removeClass('this');
	$('.tabs-view .li').eq($(this).index()).removeClass('hidden').siblings().addClass('hidden');
	ipcRenderer.send('changeHeight', $(document.body).outerHeight(false))
});

ipcRenderer.send('changeHeight', $(document.body).outerHeight(false));
ipcRenderer.on('windowBlur', () => $(document.body).addClass('nonFocus'));
ipcRenderer.on('windowFocus', () => $(document.body).removeClass('nonFocus'));