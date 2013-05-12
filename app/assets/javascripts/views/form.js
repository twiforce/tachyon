var FormView = Backbone.View.extend({
    tagName:    'form',
    id:         'qr_form',
    inThread:   0,
    attributes: {
        method:     'post',
        enctype:    'multipart/form-data',
        action:     '/create'
    },

    events:     {
        "click #file_span":     "toggleFileOrVideo",
        "click #video_span":    "toggleFileOrVideo",
        'submit':               'ajaxSubmit',
        'click .editbox b, .editbox i, .editbox u, .editbox s, .editbox span, .editbox a': 'markup',
        'focusin input, textarea': 'hidePlaceholder',
        'focusout input, textarea': 'showPlaceholder',
        'keydown textarea': function(event)  {
            if (event.ctrlKey && event.keyCode == 13) {
                if (settings.get('ctrl_submit') == true) {
                    $('#qr_form').submit();
                }
            }
        }
    },

    initialize: function() {
        _.bindAll(this, 'render');
        this.render();
        if ($.browser.opera == false) {
            $.each(this.$el.find('input, textarea'), function(index, div) {
                div = $(div);
                if (div.attr('placeholder') != undefined) {
                    div.data('placeholder', div.attr('placeholder'));
                }
            });
        }
        if (tagList.captcha != undefined) {
            this.setCaptcha(tagList.captcha);
            tagList.captcha = undefined;
        }
    },

    adjustTopForOperagovno: function() {
        var top = window.innerHeight - (this.$el.height() + 41);
        top += "px";
        this.$el.css('top', top);
        return this;
    },

    hidePlaceholder: function(event) {
        if ($.browser.opera) {
            return false;
        }
        var input = $(event.currentTarget);
        if (input.attr('placeholder') != undefined) {
            input.removeAttr('placeholder');
        }
    },

    showPlaceholder: function(event) {
        if ($.browser.opera) {
            return false;
        }
        var input = $(event.currentTarget);
        if (input.val().length == 0) {
            input.attr('placeholder', input.data('placeholder'));
        }  
    },

    ajaxSubmit: function(event) {
        event.preventDefault();
        this.toggleLoading('on');
        var errors = form.$el.find('.errors').first();
        errors.html('');
        var data = new FormData();
        if (this.captchaChallenge != undefined) {
            var captchaResponse = this.$el.find('#captcha_word').val();
            if (captchaResponse.length < 3) {
                errors.html(l.errors.captcha.old);
                if ($.browser.opera) {
                    form.adjustTopForOperagovno();
                }
                this.toggleLoading('off');
                setTimeout(function() {
                    $('#captcha_word').focus();
                }, 100);
                return false;
            }
            data.append('captcha[challenge]', this.captchaChallenge);
            data.append('captcha[response]', this.$el.find('#captcha_word').val());
        }
        data.append('defence_token',     settings.get('defence_token'));
        data.append('message[message]',  this.$el.find('textarea').first().val());
        data.append('message[title]',    this.$el.find('#form_title').first().val());
        data.append('message[password]', this.$el.find('#form_password').first().val());
        data.append('file',              this.$el.find('#file_field')[0].files[0]);
        data.append('video',             this.$el.find('#video_field').first().val());
        if (this.$el.find('#form_tags').first().css('display') == 'inline-block') {
            data.append('tags', this.$el.find('#tag_field').first().val());
        } else {
            var sage = this.$el.find('#sage input').first().attr('checked') == 'checked';
            data.append('message[sage]', sage);
        }
        if (action == 'index') {
            data.append('returnpost', 'yeah sure');
        }
        settings.set('password', this.$el.find('#form_password').first().val());
        if ($.browser.opera) {
            setTimeout(form.adjustTopForOperagovno, 100);
        }
        $.ajax({
            url: this.$el.attr('action'),
            data: data,
            type: 'post',
            cache: false,
            processData: false,
            contentType: false,
            success: function(response) {
                form.toggleLoading('off');
                if (response.defence_token != undefined) {
                    settings.set('defence_token', response.defence_token);
                }
                if (response.status == 'success') {
                    form.$el.find("#file_span").addClass('selected');
                    form.$el.find("#video_span").removeClass('selected');
                    form.$el.find("#file_field").css('display', 'inline');form
                    form.$el.find("#video_field").css('display', 'none');
                    form.clear().hide();
                    if (response.post != undefined) {
                        router.addPost(response.post, true);
                    } else if (response.thread_rid != undefined) {
                        settings.toggleFavorite(response.thread_rid, 'add');
                        if (action != 'live') {
                            router.navigate('/thread/' + response.thread_rid, {trigger: true});
                        }
                    } else if (response.post_rid != undefined) {
                        router.highlightPost(response.post_rid);
                    }
                    if (response.password != undefined) {
                        form.$el.find("#form_password").val(response.password);
                        settings.set('password', response.password);
                    }
                } else {
                    for (i=0; i < response.errors.length; i++) {
                        errors.append(response.errors[i]);
                        if (i != response.errors.length-1) {
                            errors.append('<br />');
                        }
                    }
                }
                form.setCaptcha(response.captcha);
                if ($.browser.opera) {
                    form.adjustTopForOperagovno();
                }
                return false;
            }, 
            error: function() {
                form.toggleLoading('off');
                errors.html(l.errors.unknown)
                return false;
            }
        });
    },

    clear: function() {
        this.$el.find('#form_title, #video_field, textarea').val('');
        var file = this.$el.find('#file_field');
        try {
            file[0].outerHTML = "<input type='file' name='file' id='file_field'>";
        } catch (exception) {
            // do nothing
        }
        try {
            file.parent().html(file.parent().html());
        } catch (exception) {
            // do nothing
        }
        return this;
    },

    toggleLoading: function(trigger) {
        if (trigger == 'off') {
            if (this.loadingTimeout != undefined) {
                clearTimeout(this.loadingTimeout);
                this.loadingTimeout = undefined;
            }
            form.$el.find('input,  textarea').removeAttr('disabled');
            form.$el.find('#form_loading').remove();
            form.$el.find('.divider').css('opacity', 1);
        } else if (trigger == 'on') {
            this.$el.find('input, textarea').attr('disabled', 'disabled');
            this.loadingTimeout = setTimeout(function() {
                var loading = $("<img src='" + window.base64images.loading + "' id='form_loading' />");
                form.$el.append(loading);
                form.$el.find('.divider').css('opacity', 0.4);
            }, 600);
        }
        return this;
    },

    show: function(postRid, threadRid, what) {
        bottomMenu.setButtonValue(l.close_form);
        if (what != 'reply') {
            what = 'create';
        }
        if (threadRid == null) {
            threadRid = this.inThread;
        }
        this.targetOn(what, threadRid);
        var textarea = this.$el.find('textarea').first();
        textarea.focus();
        if (postRid != undefined) {
            if (textarea.val() != '') {
                textarea.val(textarea.val() + '\n');
            }
            textarea.val(textarea.val() + ">>" + postRid + "\n");
        }
        if ($.browser.chrome) {
            this.$el.animate({right: 15}, 400);
        } else {
            this.$el.animate({right: -10}, 400);
        }
        return this;
    },

    hide: function() {
        this.$el.find('.errors').html('');
        this.$el.animate({right: -(this.$el.width() + 50)}, 400);
        bottomMenu.setButtonValue('previous');
        return this;
    },

    targetOn: function(what, rid) {
        this.inThread = rid;
        bottomMenu.$el.css('display', 'block');
        if (what == 'create') {
            this.$el.attr('action', '/create');
            this.$el.find('.disclaimer').first().html(l.create_new_thread + ":");
            this.toggleTagsOrSage('tags');
            var menuValue = l.create_thread;
        } else {
            this.$el.attr('action', '/thread/' + rid + '/reply');
            this.$el.find('.disclaimer').first().html(l.reply_to_thread + ' #' + rid + ":");
            this.toggleTagsOrSage('sage');
            var menuValue = l.reply
        }
        if ($("#bottom_menu #qr_button").html() != l.close_form) {
            bottomMenu.setButtonValue(menuValue);
        }
        return this;
    },

    setTag: function(tag)  {
        this.$el.find('#tag_field').val(tag);
        return false;
    },

    getPassword: function() {
        return this.$el.find('.password_field').val();
    },

    toggleFileOrVideo: function(e) {
        if ($(e.target).attr('id') == 'file_span') {
            this.$el.find("#file_span").addClass('selected');
            this.$el.find("#video_span").removeClass('selected');
            this.$el.find("#file_field").css('display', 'inline').focus();
            this.$el.find("#video_field").css('display', 'none');
        } else {
            this.$el.find("#video_span").addClass('selected');
            this.$el.find("#file_span").removeClass('selected');
            this.$el.find("#video_field").css('display', 'inline').focus();
            this.$el.find("#file_field").css('display', 'none');
        }
        return this;
    },
    
    toggleTagsOrSage: function(what) {
        if (what == 'sage') {
            this.$el.find('#sage').first().css('display', 'inline-block');
            this.$el.find('#form_tags').first().css('display', 'none');
        } else if (what == 'tags') {
            this.$el.find('#sage').first().css('display', 'none');
            this.$el.find('#form_tags').first().css('display', 'inline-block');
        }
        return this;
    },

    markup: function(event) {
        var clicked = $(event.currentTarget);
        var textarea = this.$el.find('textarea').first();
        var insertMarkup = function(start, end) {
            var initialValue = textarea.val();
            var section = textarea.getSelection();
            var left = initialValue.substring(0, section.start);
            var right = initialValue.substring(section.end, initialValue.length);
            section.text = section.text.replace(/\n/mg, end + '\n' + start);
            textarea.val(left + start + section.text + end + right);
            var caret = section.end + start.length;
            textarea.focus().caret(caret, caret);
            return false;
        }
        if (clicked.is('b')) {
            insertMarkup('**', '**');
        } else if (clicked.is('i')) {
            insertMarkup('*', '*');
        } else if (clicked.is('u')) {
            insertMarkup('__', '__');
        } else if (clicked.is('s')) {
            insertMarkup('_', '_');
        } else if (clicked.is('span')) {
            if (clicked.hasClass('spoiler')) {
                insertMarkup('%%', '%%');
            } else if (clicked.hasClass('quote')) {
                insertMarkup('> ', ' ');
            }
        } else if (clicked.is('a')) {
            var url = prompt(l.link_prompt.url);
            var name = prompt(l.link_prompt.name);
            if (url.length > 0 && name.length > 0) {
                if (url.substring(0, 7) != 'http://' && url.substring(0, 8) != 'https://') {
                    url = 'http://' + url;
                }
                insertMarkup(("[" + url + " || " + name + "]"), "");
            }
        }
        return false;
    },

    setCaptcha: function(key) {
        if (key == undefined) {
            this.$el.find('#captcha_field').css('display', 'none');    
            this.$el.find('#captcha_image').attr('src', window.base64images.loading);
        } else {
            this.$el.find('#captcha_field').css('display', 'block');
            this.$el.find('#captcha_image').attr('src', '/captcha/' + key + '.png');
        }
        setTimeout(function() {
            $('#captcha_word').val("").focus();
        }, 100);
        this.captchaChallenge = key;
    },

    render: function() {
        var t = "<div class='divider errors'></div>";
        t += "<div class='divider disclaimer'>" + l.create_new_thread + ":</div>";
        t += "<div class='divider'>";
            t += "<input type='text' name='message[title]' id='form_title'";
            t += " placeholder='" + l.form.placeholder.title + "'>";
            t += "<input type='submit' value='" + l.send + "' class='form_submit'>";
        t += "</div><div class='divider'>";
            t += "<div class='editbox'>";
                t += "<b>Bold</b>";
                t += "<i>Italic</i>";
                t += "<u>Underline</u>";
                t += "<s>Strike</s>";
                t += "<span class='quote'>&gt; Quote</span>";
                t += "<span class='spoiler'>Spoiler</span>";
                t += "<a class='link_tag'>Link</a>"
            t += "</div>"
        t += "</div>";
        t += "<div class='divider'><textarea name='message[message]' ";
        t += "placeholder='" + l.form.placeholder.message + "'></textarea></div>";
        t += "<div class='divider mini'>";
            t += "<div class='left'>";
                t += "<span id='file_span' class='selected'>" + l.file + "</span>";
                t += "&nbsp;/&nbsp;";
                t += "<span id='video_span'>YouTube</span>";
                t += "<span><input type='file' name='file' id='file_field'></span>";
                t += "<input type='text' name='video' id='video_field'  placeholder='" + l.form.placeholder.video + "'>";
            t += "</div><div class='right'>";
                t += "<label id='sage'>";
                    t += "sage: <input type='checkbox' name='message[sage]'>";
                t += "</label><label id='form_tags'>";
                    t += l.tags + ": <input type='text' id='tag_field' name='tags'>";
                t += "</label><label>";
                    t += l.password + ": <input type='password' id='form_password'";
                    t += " name='message[password]' ";
                    if (settings.get('password') != undefined) {
                        t += "value='" + settings.get("password") + "' ";
                    }
                    t += "/>";
                t += "</label>";
            t += "</div>";
        t += "</div>";
        t += "<div class='divider' id='captcha_field'>";
            t += "<img alt='captcha' id='captcha_image' src='"+ window.base64images.loading + "' />";
            t += "<input id='captcha_word' name='captcha[response]' placeholder='" + l.form.placeholder.captcha + "' type='text'>";
        t += "</div>";
        this.el.innerHTML = t;
        return this;
    },
});