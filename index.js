//Developed by @mario v1.0.20200924
const { app, BrowserWindow, screen, ipcMain, Menu, shell, TouchBar, nativeTheme, dialog, Tray, net } = require('electron');
const { TouchBarLabel, TouchBarButton, TouchBarSpacer } = TouchBar;
const path = require('path');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
//const localshortcut = require('electron-localshortcut');
const { menubar } = require('menubar');
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
if(!app.isPackaged)require('electron-reloader')(module, {});
let store = new Store();
let isMac = process.platform === 'darwin';
let feedUrl = 'https://www.laokema.com/desktop';
//let tray = null;
let win = null;
let devtools = null;

//只启动一个实例
let gotTheLock = app.requestSingleInstanceLock();
if(!gotTheLock){
	app.quit();
}else{
	app.on('second-instance', (event, commandLine, workingDirectory) => {
		//当运行第二个实例时,将会聚焦到myWindow这个窗口
		if (win) {
			if (win.isMinimized()) win.restore();
			win.focus();
		}
	});
	
	nativeTheme.themeSource = nativeTheme.shouldUseDarkColors ? 'dark' : 'system';
	
	app.whenReady().then(() => {
		let { width, height } = screen.getPrimaryDisplay().workAreaSize;
		win = new BrowserWindow({
			x: width - 320 - 20,
			y: Math.floor((height - 568) / 2),
			width: 320,
			height: 568,
			minWidth: 320,
			minHeight: 568,
			useContentSize: true,
			show: false,
			maximizable: false,
			titleBarStyle: 'hidden',
			frame: false,
			//transparent: true,
			//icon: path.join(__dirname, 'assets', 'icons', 'icon', '64x64.png'),
			webPreferences: {
				nodeIntegration: true,
				enableRemoteModule: true,
				webviewTag: true,
				//devTools: false
			},
		});
		
		let currentUserAgent = store.get('currentUserAgent') || '';
		currentUserAgent = currentUserAgent.replace(/[\n\r]/g, '');
		if(currentUserAgent.length){
			currentUserAgent = currentUserAgent.replace(/{name}/g, app.getName()).replace(/{version}/g, app.getVersion());
			win.webContents.setUserAgent(currentUserAgent);
		}
		win.loadFile('pages/index/index.html');
		win.once('ready-to-show', () => {
			win.show();
		});
		win.on('page-title-updated', (e, cmd) => {
			e.preventDefault();
		});
		win.on('resize', () => {
			let s = win.getSize();
			win.setPosition(width - s[0] - 20, Math.floor((height - s[1]) / 2), true);
			store.set('currentWindowSize', s[0]+'*'+s[1]);
		});
		win.on('blur', () => {
			win.webContents.send('windowBlur');
		});
		win.on('focus', () => {
			win.webContents.send('windowFocus');
		});
		win.on('closed', () => {
			app.quit();
		});
		/*//点击关闭按钮，退出任务栏，最小化到托盘
		win.on('closed', () => {
			win = null;
		});
		win.on('close', (e) => {
			//回收BrowserWindow对象
			if(win.isMinimized()){
				win = null;
			}else{
				if(isMac){
					//回收BrowserWindow对象
					e.preventDefault();
					win.minimize();
				}else{
					win.hide();
					win.setSkipTaskbar(true);
					e.preventDefault();
				}
			}
		});*/
		ipcMain.on('copyHtmlAct', (e) => {
			win.webContents.send('copyHtml');
		});
		ipcMain.on('copyHtml', (e) => {
			dialog.showMessageBoxSync(win, {
				message: '复制成功',
				detail: 'HTML代码已复制至剪切板'
			});
		});
		
		let toggleDevTools = function(w){
			if(isMac){
				w.webContents.toggleDevTools();
			}else{
				if(!devtools){
					devtools = new BrowserWindow({ title: 'Developer Tools', height: 280, parent: w });
					devtools.menuBarVisible = false;
					w.webContents.setDevToolsWebContents(devtools.webContents);
					w.webContents.openDevTools({ mode: 'detach' });
				}else{
					devtools.destroy();
					devtools = null;
				}
			}
		};
		
		let subwin = null;
		let openPreferences = (e) => {
			subwin = new BrowserWindow({
				width: 600,
				height: 400,
				useContentSize: true,
				parent: win,
				//modal: true,
				title: '偏好设置',
				resizable: false,
				minimizable: false,
				maximizable: false,
				show: false,
				titleBarStyle: 'hidden',
				frame: false,
				webPreferences: {
					nodeIntegration: true,
					enableRemoteModule: true,
					//devTools: false
				}
			});
			subwin.loadFile('pages/preferences/preferences.html');
			subwin.once('ready-to-show', () => {
				subwin.show();
			});
			subwin.on('blur', () => {
				subwin.webContents.send('windowBlur');
			});
			subwin.on('focus', () => {
				subwin.webContents.send('windowFocus');
			});
			subwin.menuBarVisible = false;
			//toggleDevTools(subwin);
		};
		ipcMain.on('openPreferences', openPreferences);
		ipcMain.on('changeHeight', (e, arg) => {
			subwin.setBounds({ height:arg }, true);
		});
		
		/*localshortcut.register(win, 'CommandOrControl+,', () => {
			openPreferences();
		});
		localshortcut.register(win, 'CommandOrControl+i', () => {
			win.webContents.toggleDevTools();
		});*/
		
		ipcMain.on('openAtLogin', (e, arg) => {
			app.setLoginItemSettings({
				openAtLogin: arg
			});
		});
		
		let alwaysOnTop = store.get('alwaysOnTop') || 0;
		if(alwaysOnTop === 1){
			win.setAlwaysOnTop(!!alwaysOnTop);
		}
		ipcMain.on('alwaysOnTop', (e, arg) => {
			win.webContents.send('alwaysOnTop', arg);
		});
		
		let defaultOpenDevTools = store.get('defaultOpenDevTools') || 0;
		if(defaultOpenDevTools === 1){
			toggleDevTools(win);
			setTimeout(() => win.focus(), 500);
		}
		
		let useDarkColors = store.get('useDarkColors') || 0;
		if(useDarkColors === 1){
			nativeTheme.themeSource = 'dark';
		}
		ipcMain.on('useDarkColors', (e, arg) => {
			nativeTheme.themeSource = arg ? 'dark' : 'system';
		});
		
		let size = store.get('currentWindowSize') || '';
		if(size.length){
			let s = size.split('*'), w = Number(s[0]), h = Number(s[1]);
			win.setSize(w, h);
			win.setPosition(width - w - 20, Math.floor((height - h) / 2));
		}
		ipcMain.on('setWindowSize', (e, arg) => {
			let s = arg.split('*'), w = Number(s[0]), h = Number(s[1]);
			win.setSize(w, h, true);
			setTimeout(() => {
				let size = win.getSize();
				win.setPosition(width - size[0] - 20, Math.floor((height - size[1]) / 2), true);
			}, 250);
		});
		ipcMain.on('getWindowSize', e => {
			let size = win.getSize();
			e.sender.send('getWindowSize', size);
		});
		
		/*setTimeout(() => {
			let size = win.getSize();
			win.setPosition(width, Math.floor((height - size[1]) / 2), true);
		}, 3000);*/
		
		//菜单栏
		let template = [
			{
				label: isMac?app.name:'文件',
				submenu: [
					{ label: `关于${app.name}`, role: 'about' },
					{ type: 'separator' },
					{
						label: '偏好设置',
						accelerator: 'CmdOrCtrl+,',
						click: function(item, focusedWindow){
							openPreferences();
						}
					},
					{
						label: '检查更新',
						click: function(item, focusedWindow){
							autoUpdater.checkForUpdates();
						}
					},
					...(isMac ? [
						{ type: 'separator' },
						{ label: '服务', role: 'services' },
						{ label: `隐藏${app.name}`, role: 'hide' },
						{ label: '隐藏其他应用', role: 'hideothers' },
						{ label: '显示全部', role: 'unhide' },
					] : []),
					{ type: 'separator' },
					{ label: `退出${app.name}`, role: 'quit' }
				]
			},
			{
				label: '编辑',
				submenu: [
					{ label: '撤销', role: 'undo' },
					{ label: '重做', role: 'redo' },
					{ type: 'separator' },
					{ label: '剪切', role: 'cut' },
					{ label: '复制', role: 'copy' },
					{ label: '粘贴', role: 'paste' },
					...(isMac ? [
						{ label: '粘贴并匹配样式', role: 'pasteAndMatchStyle' },
						{ label: '删除', role: 'delete' },
						{ label: '全选', role: 'selectAll' },
						{ type: 'separator' },
						{
							label: '语音',
							submenu: [
								{ label: '开始讲话', role: 'startspeaking' },
								{ label: '停止讲话', role: 'stopspeaking' }
							]
						}
					] : [
						{ label: '删除', role: 'delete' },
						{ type: 'separator' },
						{ label: '全选', role: 'selectAll' }
					]),
					{ type: 'separator' },
					{
						label: '复制HTML代码',
						accelerator: 'CmdOrCtrl+U',
						click: function(item, focusedWindow){
							win.webContents.send('copyHtml');
						}
					}
				]
			},
			{
				label: '窗口',
				role: 'window',
				submenu: [
					{
						label: '最小化',
						accelerator: 'CmdOrCtrl+M',
						role: 'minimize'
					},
					{
						label: '关闭',
						accelerator: 'CmdOrCtrl+W',
						role: 'close'
					},
					{ type: 'separator' },
					{
						label: '开发者工具',
						accelerator: 'CmdOrCtrl+I',
						click: function(item, focusedWindow){
							toggleDevTools(win);
						}
					},
					{ type: 'separator' }
				]
			},
			{
				label: '帮助',
				role: 'help',
				submenu: [
					{
						label: '意见反馈',
						click: () => {
							shell.openExternal('https://www.laokema.com/about');
						}
					}
				]
			}
		];
		let menu = Menu.buildFromTemplate(template)
		Menu.setApplicationMenu(menu);
		
		//touchBar栏
		let devTools = new TouchBarButton({
			label: '开发者工具',
			click: () => {
				toggleDevTools(win);
			}
		});
		let isAlwaysOnTop = alwaysOnTop === 1;
		let alwaysTop = new TouchBarButton({
			label: isAlwaysOnTop ? '取消置顶' : '窗口置顶',
			click: () => {
				isAlwaysOnTop = !isAlwaysOnTop;
				win.setAlwaysOnTop(isAlwaysOnTop);
				if(isAlwaysOnTop){
					store.set('alwaysOnTop', 1);
					alwaysTop.label = '取消置顶';
				}else{
					store.delete('alwaysOnTop');
					alwaysTop.label = '窗口置顶';
				}
			}
		});
		let spinning = false;
		let reel1 = new TouchBarLabel({ label: '' });
		let reel2 = new TouchBarLabel({ label: '' });
		let reel3 = new TouchBarLabel({ label: '' });
		let result = new TouchBarLabel({ label: '' });
		let spin = new TouchBarButton({
			label: '🎰Slot',
			backgroundColor: '#7851A9',
			click: () => {
				if(spinning)return;
				spinning = true;
				result.label = '';
				let timeout = 10;
				let spinLength = 4000;
				let startTime = Date.now();
				let getRandomValue = () => {
					let values = ['🍒', '💎', '7️⃣', '🍊', '🔔', '⭐', '🍇', '🍀'];
					return values[Math.floor(Math.random() * values.length)];
				};
				let spinReels = () => {
					reel1.label = getRandomValue();
					reel2.label = getRandomValue();
					reel3.label = getRandomValue();
					if((Date.now() - startTime) >= spinLength){
						let uniqueValues = new Set([reel1.label, reel2.label, reel3.label]).size;
						if(uniqueValues === 1){
							// All 3 values are the same
							result.label = '💰 Jackpot!';
							result.textColor = '#FDFF00';
						}else if(uniqueValues === 2){
							// 2 values are the same
							result.label = '😍 Winner!';
							result.textColor = '#FDFF00';
						}else{
							// No values are the same
							result.label = '🙁 Spin Again';
							result.textColor = null;
						}
						spinning = false;
					}else{
						timeout *= 1.1;
						setTimeout(spinReels, timeout);
					}
				};
				spinReels();
			}
		});
		let touchBar = new TouchBar({
			items: [
				devTools,
				alwaysTop,
				new TouchBarSpacer({ size: 'large' }),
				spin,
				new TouchBarSpacer({ size: 'small' }),
				reel1,
				new TouchBarSpacer({ size: 'small' }),
				reel2,
				new TouchBarSpacer({ size: 'small' }),
				reel3,
				new TouchBarSpacer({ size: 'large' }),
				result
			]
		});
		win.setTouchBar(touchBar);
	
		//系统托盘
		/*tray = new Tray(path.join(__dirname, 'assets', 'icons', 'icon', 'tray.png')); //为兼容所有平台路径分割符
		let contextMenu = Menu.buildFromTemplate([
			{
				label: alwaysOnTop === 1 ? '取消置顶' : '窗口置顶',
				click: function(item, focusedWindow){
					alwaysOnTop === 1 ? store.delete('alwaysOnTop') : store.set('alwaysOnTop', 1);
					contextMenu.items[0].label = alwaysOnTop === 1 ? '窗口置顶' : '取消置顶';
					alwaysOnTop = !alwaysOnTop;
					tray.setContextMenu(contextMenu);
					win.setAlwaysOnTop(alwaysOnTop);
				}
			},
			{
				label: '开发者工具',
				click: function(item, focusedWindow){
					win.webContents.toggleDevTools();
				}
			},
			{ type: 'separator' },
			{
				label: '退出',
				click: () => {
					win.destroy();
				}
			}
		]);
		tray.setContextMenu(contextMenu);*/
		let iconName = isMac ? (nativeTheme.shouldUseDarkColors ? 'tray-white.png' : 'tray.png') : 'tray-white.png';
		let mb = menubar({
			index: 'file://' + path.join(__dirname, 'pages', 'index', 'tray.html'),
			icon: path.join(__dirname, 'assets', 'icons', 'icon', iconName),
			showDockIcon: true,
			//showOnRightClick: true,
			preloadWindow: true,
			browserWindow: {
				width: 170,
				height: 201,
				useContentSize: true,
				parent: win,
				resizable: false,
				minimizable: false,
				maximizable: false,
				//alwaysOnTop: true,
				webPreferences: {
					nodeIntegration: true,
					enableRemoteModule: true
				}
			}
		});
		/*mb.on('right-click', () => mb.showWindow());
		mb.on('after-create-window', () => mb.window.openDevTools({ mode: 'detach' }))*/
		ipcMain.on('hideMenubar', (e, arg) => {
			mb.hideWindow();
		});
		ipcMain.on('toggleDevTools', (e, arg) => {
			toggleDevTools(win);
		});
		
		//检查更新
		//通过主进程发送事件给渲染进程提示更新信息
		let isShowed = false;
		win.on('show', () => {
			if(!isShowed){
				isShowed = true;
				let sendUpdateMessage = (arg) => {
					win.webContents.send('message', arg);
				};
				let message = {
					error: '检查更新出错',
					checking: '正在检查更新',
					updateAva: '检测到新版本',
					updateNotAva: '当前为最新版本'
				};
				autoUpdater.autoDownload = false;
				if(!app.isPackaged)autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml');
				autoUpdater.setFeedURL({
					provider: 'generic',
					url: feedUrl
				});
				autoUpdater.on('error', function(dev, err){
					sendUpdateMessage({ type: 'error', msg: err });
				});
				autoUpdater.on('checking-for-update', function(){
					sendUpdateMessage({ type: 'checking-for-update', msg: message.checking });
				});
				autoUpdater.on('update-available', function(info){
					//sendUpdateMessage({ type: 'update-available', msg: message.updateAva });
					sendUpdateMessage(null);
					let response = dialog.showMessageBoxSync(win, {
						type: 'question',
						buttons: ['立即更新', '取消'],
						detail: '检测到新版本，是否立即更新？'
					});
					if(response === 1)return;
					autoUpdater.downloadUpdate();
				});
				autoUpdater.on('update-not-available', function(info){
					sendUpdateMessage({ type: 'update-not-available', msg: message.updateNotAva });
				});
				//更新下载进度事件
				autoUpdater.on('download-progress', function(progress){
					sendUpdateMessage({ type: 'download-progress', msg: '已下载 ' + Math.floor(progress.percent) + '%' });
					if(!!win)win.setProgressBar(progress.percent / 100);
					/*bytesPerSecond: bps/s //传送速率
					percent : 百分比 //我们需要这个就可以了
					total : 总大小
					transferred: 已经下载*/
				});
				autoUpdater.on('update-downloaded', function(event, releaseNotes, releaseName, releaseDate, updateUrl, quitAndUpdate){
					sendUpdateMessage({ type: 'update-downloaded', 'releaseNotes': releaseNotes, 'releaseName': releaseName });
				});
				ipcMain.on('updateNow', (e, arg) => {
					let response = dialog.showMessageBoxSync(win, {
						type: 'info',
						buttons: ['立即更新', '稍后重启'],
						message: isMac ? arg.releaseName : arg.releaseNotes,
						detail: '已下载新版本，选择立即更新将重新启动应用程序。'
					});
					if(response === 1)return;
					autoUpdater.quitAndInstall();
				});
				//渲染进程的检查更新操作自行编写
				ipcMain.on('checkForUpdate', () => {
					autoUpdater.checkForUpdates();
				});
				//autoUpdater.checkForUpdates();
			}
		});
		
		//dock菜单
		let dockTemplate = Menu.buildFromTemplate([
			{ label: `关于${app.name}`, role: 'about' },
			{ type: 'separator' },
			{
				label: '偏好设置',
				accelerator: 'CmdOrCtrl+,',
				click: function(item, focusedWindow){
					openPreferences();
				}
			},
			{
				label: '检查更新',
				click: function(item, focusedWindow){
					autoUpdater.checkForUpdates();
				}
			},
			{ type: 'separator' },
			{
				label: '开发者工具',
				accelerator: 'CmdOrCtrl+I',
				click: function(item, focusedWindow){
					toggleDevTools(win);
				}
			},
			{
				label: '复制HTML代码',
				accelerator: 'CmdOrCtrl+U',
				click: function(item, focusedWindow){
					win.webContents.send('copyHtml');
				}
			},
			{
				label: '意见反馈',
				click: () => {
					shell.openExternal('https://www.laokema.com/about');
				}
			}
		]);
		app.dock.setMenu(dockTemplate);
		
		/*dock弹跳
		let dockId = app.dock.bounce();
		app.dock.cancelBounce(dockId);
		app.dock.hide(); //隐藏
		*/
		
		//网络请求
		/*let request = net.request({
			/!*method: 'GET',
			protocol: 'https:',
			hostname: 'www.laokema.com',
			port: 443,
			path: '/api/other/desktopUpdate/platform/darwin/version/1.0.0'*!/
			url: feedUrl
		});
		request.on('response', (response) => {
			console.log(`STATUS: ${response.statusCode}`)
			console.log(`HEADERS: ${JSON.stringify(response.headers)}`)
			response.on('data', (chunk) => {
				console.log(`BODY: ${chunk}`)
			});
			response.on('end', () => {
				console.log('No more data in response.')
			});
			response.on('error', (error) => {
				console.log(`ERROR: ${JSON.stringify(error)}`)
			});
		});
		request.on('error', (error) => {
			console.log(`ERROR: ${JSON.stringify(error)}`)
		});
		request.end();*/
	});
	
	/*通知
	const { Notification } = require('electron');
	if(Notification.isSupported()){
		let notification = new Notification({
			title: 'title',
			body: 'this is message',
			actions: [
				{
					type: 'button',
					text: 'button name'
				}
			]
		});
		notification.show();
	}*/
	
	app.on('window-all-closed', () => {
		app.quit();
	});
}