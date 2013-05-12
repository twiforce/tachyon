var SettingsView = Backbone.View.extend({
    tagName:  'div',
    id:       'settings',
    el:       '',

    events: {
        'click .close_button': 'close',
        'change input, select': 'onChange',
        'click #settings_switch div': 'switchView',
        "submit #admin_settings form": "submitAdminSettings",
    },

    initialize: function() {
        var defaults = {
            hidden_threads:     [],
            hidden_replies:     [],
            hidden_tags:        ['nsfw', 'trash'],
            favorites:          [],
            seen:               {},
            threads_per_page:   15,
            last_replies:       0,
            font_size:          14,
            fixed_header:       true,
            strict_hiding:      false,
            scroll_to_post:     true,
            shadows:            false,
            lamer_buttons:      false,
            search_buttons:     false,
            ctrl_submit:        true,
            mamka:              false,
            order:              'bump',
            style:              'tachyon',
        }
        var settingsLink = this;
        $.each(defaults, function(attr, defaultValue) {
            if (settingsLink.get(attr) == undefined) {
                settingsLink.set(attr, defaultValue);
            }
        });
        _.bindAll(this, 'render');
        this.render();
        this._set();
        if (this.get('seen') == "") {
            this.set('seen', {});
        }
        localStorage.removeItem('hidden_posts');
        return this;
    },

    contains: function(array, value) {
        var contains = [false, undefined];
        for (var i=0; i< array.length; i++) {
            if (array[i] == value) {
                contains[0] = true;
                contains[1] = i;
                break;
            }
        }
        return contains;
    },

    submitAdminSettings: function(event) {
        event.preventDefault();
        var form = $(event.currentTarget);
        var data = {};
        data['dyson'] = form.find("select[name='dyson']").val();
        limits = ['[tau]', '[ip][thread]', '[ip][post]',
        '[captcha][thread]', '[captcha][post]', '[global]'];
        limits.forEach(function(limit) {
            limit = "speed_limits" + limit;
            data[limit] = form.find("input[name='" + limit + "']").val();
        });
        if (form.find("input[name='spamtxt[enabled]']").attr('checked') == 'checked') {
            data['spamtxt[enabled]'] = 'on';
        }
        data['spamtxt[words]'] = form.find('textarea').val();
        form.find('#admin_settings_submit').val('.................');
        $.ajax({
            type: 'post',
            data: data,
            url: "/admin/settings/set",
            success: function(response) {
                form.find('#admin_settings_submit').val('Сохранить');
            }, 
            error: function() {
                document.location.reload();
            }
        });
        return false;
    },


    set: function(attr, value) {
        return localStorage.setItem(attr, JSON.stringify(value));
    },

    get: function(attr) {
        return JSON.parse(localStorage.getItem(attr));
    },

    isFavorite: function(threadRid) {
        var contains = this.contains(this.get('favorites'), threadRid);
        return (contains[0] == true);
    },

    isHidden: function(object) {
        var threads = this.contains(this.get('hidden_threads'), object);
        var posts = this.contains(this.get('hidden_replies'), object);
        var tags = this.contains(this.get('hidden_tags'), object);
        return (posts[0] == true || tags[0] == true || threads[0] == true);
    },

    toggleFavorite: function(threadRid, action) {
        var favorites = this.get('favorites');
        var contains = this.contains(this.get('favorites'), threadRid);
        if (contains[0] == false && action == 'add') {
            if (favorites.length >= 50) {
                alert(t.errors.favorites_too_many);
                return false;
            } 
            favorites.push(threadRid);
        } else if (contains[0] == true && action == 'remove') {
            favorites.splice(contains[1], 1);
        }
        this.set('favorites', favorites);
        return true;
    },

    hide: function(object, isThread) {
        return this.hidingToggle(object, 'hide', isThread);
    },

    unhide: function(object, isThread) {
        return this.hidingToggle(object, 'unhide', isThread);
    },

    hidingToggle: function(object, action, isThread) {
        if (typeof object == 'string') {
            var key = 'hidden_tags';
        } else {
            if (isThread == false) {
                var key = 'hidden_replies';
            } else {
                var key = 'hidden_threads';
            }
        }
        var hidden = this.get(key);
        var contains = this.contains(hidden, object);
        if (action == 'unhide' && contains[0] == true) {
            hidden.splice(contains[1], 1);
        } else if (action == 'hide' && contains[0] == false) {
            hidden.push(object);
            if (key == 'hidden_threads' && hidden.length > 50) {
                hidden.shift();                
            }
        }
        this.set(key, hidden);
        return false;
    },

    show: function() {
        if (admin == true && this.$el.find("#admin_settings").length == 0) {
            this.getAdminSettings();
        }
        this.$el.css({display: 'block', opacity: 0});
        this.adjust();
        this.$el.animate({opacity: 0.95}, 200);
        return this;
    },

    close: function() {
        this.$el.animate({opacity: 0}, 200);
        var element = this.$el;
        setTimeout(function() {
            element.css('display', 'none');
        }, 210);
        return this;
    },

    adjust: function() {
        var top = (window.innerHeight - this.$el.height()) / 2;
        var left = (document.body.clientWidth - this.$el.width()) / 2;
        this.$el.css({top: top, left: left});
        return this;
    }, 

    getAdminSettings: function() {
        if (admin != true) {
            return false;
        }
        $.ajax({
            type: 'post',
            url: '/admin/settings/get',
            success: function(response) {
                settings.$el.find("#settings_switch").append("<div class" +
                    "='admin_settings'>" + l.settings.defence + "</div>");
                settings.$el.append(response);
                var dyson = settings.$el.find("#admin_settings #dyson select").val();
                settings.$el.find("#" + dyson).css('display', 'block');
            }
        })
    },

    onChange: function(event) {
        var element = $(event.currentTarget);
        var value = element.val();
        if (admin == true && this.$el.find("#admin_settings").css('display') != 'none') {
            if (element.attr('name') == 'dyson') {
                this.$el.find("#tau, #sigma, #omicron").css("display", 'none');
                this.$el.find("#" + value).css('display', 'block');
            }
            return false;
        } 
        if (element.attr('name') == 'last_replies') {
            value = parseInt(value);
        }
        if (element.attr('name') == 'threads_per_page') {
            var tryInteger = parseInt(value);
            if (tryInteger >= 5 && tryInteger <= 20) {
                value = tryInteger;
            } else {
                value = 10;
                element.val(value);
            }
        } else if (element.attr('type') == 'checkbox') {
            if (element.attr('checked') == 'checked') {
                value = true;
            } else {
                value = false;
            }
            if (element.hasClass('hide_tag') == true) {
                if (value == true) {
                    this.hide(element.attr('name'));
                } else { 
                    this.unhide(element.attr('name'));
                }
                return false;
            }
        } else if (element.attr('name') == 'style') {
            value = value.charAt(0).toLowerCase() + value.slice(1);
        }
        this.set(element.attr('name'), value);
        switch (element.attr('name')) {
            case 'fixed_header':    this._fixed_header();   break;
            case 'shadows':         this._shadows();        break;
            case 'lamer_buttons':   this._lamer_buttons();  break;
            case 'mamka':           this._mamka();          break;
            case 'style':           this._style();          break;
            case 'font_size':       this._font_size();      break;
        }
        return false;
    },

    _fixed_header: function() {
        header.setFixed(this.get('fixed_header'));
        return this;
    },

    _shadows: function() {
        if (this.get('shadows') == true) {
            $('.post').css('box-shadow', '0 1px 3px #d7d7d7');
            $('.post').css('margin', "3px 0px 3px 0px");
        } else {
            $('.post').css('box-shadow', 'none');
            $('.post').css('margin', "2px 0px 2px 0px");
        }
        return this;
    },

    _lamer_buttons: function() {
        bottomMenu.toggleLamerButtons(this.get('lamer_buttons'));
        return this;
    },

    _mamka: function() {
        if (this.get('mamka') == true) {
            $('.file_container img').css('opacity', 0.15);
        } else {
            $('.file_container img').css('opacity', 1);
        }
        return this;
    },

    _style: function() {
        try {
            var style = document.getElementById("other_style");
            document.head.removeChild(style);
        } catch (exception) { /* do nothing; */ }
        if (this.get('style') == 'tachyon') {
            return this;
        }
        var style = document.createElement('link');
        style.type = "text/css";
        style.href = resources.styles[this.get('style')];
        style.rel = "stylesheet";
        style.id = "other_style";
        document.head.appendChild(style);
        return this;
    },  

    _last_replies: function() {
        return this;
    },

    _font_size: function() {
        $("#custom_font_size").remove();
        $("head").append("<style id='custom_font_size' type='text/css'>.post blockquote, "
            + ".thread blockquote {font-size: " + this.get('font_size') + "px !important}</style>");
        return this;
    },

    _set: function() {
        this.
        //     // _fixed_header().
        //     // _lamer_buttons().
                _mamka().
                _last_replies().
                _font_size().
                _style();
        //     // _shadows();
        return this;
    }, 

    switchView: function(event) {
        this.$el.find('.active').removeClass('active');
        var link = $(event.currentTarget);
        link.addClass('active');
        this.$el.find("#content_settings, #view_settings, #admin_settings").css('display', 'none');
        if (link.hasClass("content_settings") == true) {
            this.$el.find("#content_settings").css('display', 'block');
        } else if (link.hasClass("view_settings") == true) {
            this.$el.find("#view_settings").css('display', 'block');
        } else {
            this.$el.find("#admin_settings").css('display', 'block');
        }
        this.adjust();
        return false;
    },

    render: function() {
        var settingsLink = this;
        var t = "<span title='" + l.close + "' class='close_button'>×</span><br />";
        t += "<div id='settings_switch'>"
            + "<div class='view_settings active'>" + l.settings.view + "</div>"
            + "<div class='content_settings'>" + l.settings.content_filter + "</div>"
        + "</div>";
        t += "<div id='view_settings'>"
        t += "<label>" + l.settings.style + ": <select name='style'>";
            ['tachyon', 'photon', 'mauron'].forEach(function(style) {
                t += "<option name='" + style + "'";
                if (settingsLink.get('style') == style) {
                    t += " selected='selected'";
                }
                style = style.charAt(0).toUpperCase() + style.slice(1);
                t += ">" + style + "</option>";
            });
            t += "</select>"
        + "</label><br /><br />";
        t += "<label>";
            var input = "<input class='threads_per_page' name='threads_per_page'" 
            + " type='text' value='" + this.get('threads_per_page') + "' />";
            t += l.settings.threads_per_page.replace('-x-', input);
        t += "</label><br />";
        t += "<label>";
            var input = "<select name='last_replies'>";
                for (var i = 0; i < 7; i++) {
                    input += "<option name='" + i + "'";
                    if (i == this.get('last_replies')) {
                        input += " selected='selected'";
                    }
                    input += ">" + i + "</option>";
                }
            input += "</select>";
            t += l.settings.last_replies.replace('-x-', input);
        t += "</label></br /><label>"
            t += l.settings.font_size + ": <select name='font_size'>";
            [14, 16, 18, 20].forEach(function(size) {
                t += "<option value='" + size + "'";
                if (parseInt(settingsLink.get('font_size')) == size) {
                    t += " selected='selected'";
                }
                t += ">" + size + "</option>";
            });
            t += "</select>";
        t += "</label><br /><br />";
        var booleans = [    'fixed_header',      'scroll_to_post',
                            'ctrl_submit',       'shadows',
                            'lamer_buttons',     'search_buttons',
                            'mamka'                                ];
        booleans.forEach(function(option) {
            t += "<label><input class='" + option + "' name='" + option;
            t += "' type='checkbox' ";
            if (settingsLink.get(option) == true) {
                t += "checked='checked' ";
            }
            t += "/> " + l.settings[option] + "</label><br />";
        });
        t += "</div><div id='content_settings'>";
        t += "<br /><label><input type='checkbox' name='strict_hiding' value='" 
        + "strict_hiding' ";
        if (this.get('strict_hiding') == true) {
            t += "checked='checked' ";
        }
        t += "/> " + l.settings.strict_hiding + "</label>";
        t += "<p>" + l.settings.strict_hiding_about + "</p>";
        t += "</div>";
        this.el.innerHTML = t;
        return this;
    },

    renderTags: function(tags) {
        tags = "<span>" + l.settings.hide_tags + ": </span>" + tags;
        this.$el.find("#content_settings").prepend(tags);
        return this;
    },
});