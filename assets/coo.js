let $ = jQuery = require('./jquery-3.4.1.min');

module.exports = {
	overload: function(text, image, auto, callback){
		let that = this;
		let view = $('.load-view'), overlay = $('.load-overlay'), body = $(document.body);
		if(typeof text==='boolean' && !text){
			if(!view.length)return;
			setTimeout(function(){
				if(!!view.data('overload.timer'))return;
				view.removeClass('load-view-in').addClass('load-view-out');
				setTimeout(function(){
					callback = view.data('overload.callback');
					if($.isFunction(callback))callback();
					view.remove();
					overlay.remove();
				}, 400);
			}, 10);
			return;
		}
		if(typeof image==='undefined' || (typeof image==='string' && !image.length) || typeof image==='number')image = '.load-animate';
		if(typeof text==='boolean')text = '';
		if(!view.length){
			if(!overlay.length){
				overlay = $('<div class="load-overlay"></div>');
				body.append(overlay);
			}
			view = $('<div class="load-view"><div></div><span>'+text+'</span></div>');
			body.append(view);
		}else{
			let timer = view.removeAttr('style').data('overload.timer');
			if(!!timer){clearTimeout(timer);view.removeData('overload.timer');}
			view.find('div').removeAttr('class').removeAttr('style').show();
			view.find('span').removeAttr('style').show().html(text);
		}
		if(view.width()>180 && view.width()<260)view.css({'max-width':'180px'});
		view.css({'margin-top':(-view.height()/2)+'px', 'margin-left':(-view.width()/2)+'px'});
		if(!image){
			view.find('div').hide();
			view.find('span').addClass('text').css({'margin-top':(view.height()-view.find('span').outerHeight(false))/2});
		}else{
			if(image.substr(0, 1)==='.'){
				view.find('div').addClass(image.substr(1));
			}else{
				view.find('div').css({width:35, height:35, 'background-image':'url('+image+')'});
			}
		}
		if(!text)view.find('div').css({'margin-top':(view.height()-view.find('div').height())/2}).next().hide();
		setTimeout(function(){
			overlay.addClass('load-overlay-in');
			view.addClass('load-view-in');
		}, 10);
		if(auto){
			let timer = setTimeout(function(){
				let timer = view.data('overload.timer');
				if(!!timer){clearTimeout(timer);view.removeData('overload.timer')}
				that.overload(false);
			}, auto);
			view.data('overload.timer', timer);
		}
		if($.isFunction(callback))view.data('overload.callback', callback);
		return view;
	},
	overloadSuccess: function(text, auto, callback){
		let that = this;
		if(typeof auto==='undefined')auto = 3000;
		if(!!$(document.body).data('overload.auto'))auto = Number($(document.body).data('overload.auto'));
		setTimeout(function(){that.overload(text, '.load-success', auto, callback)}, 0);
	},
	overloadError: function(text, auto, callback){
		let that = this;
		if(typeof auto==='undefined')auto = 3000;
		if(!!$(document.body).data('overload.auto'))auto = Number($(document.body).data('overload.auto'));
		setTimeout(function(){that.overload(text, '.load-error', auto, callback)}, 0);
	},
	overloadProblem: function(text, auto, callback){
		let that = this;
		if(typeof auto==='undefined')auto = 3000;
		if(!!$(document.body).data('overload.auto'))auto = Number($(document.body).data('overload.auto'));
		setTimeout(function(){that.overload(text, '.load-problem', auto, callback)}, 0);
	},
	overloadWarning: function(text, auto, callback){
		let that = this;
		if(typeof auto==='undefined')auto = 3000;
		if(!!$(document.body).data('overload.auto'))auto = Number($(document.body).data('overload.auto'));
		setTimeout(function(){that.overload(text, '.load-warning', auto, callback)}, 0);
	}
}