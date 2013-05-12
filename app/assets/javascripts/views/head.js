var HeaderView = Backbone.View.extend({
    tagName:    'header',

    events: {
        'click #settings_link': 'showSettings',
        'click #posting_info b': 'showAdminLogin',
        'click #tags_link': function() {
            return false;
        }
    },

    initialize: function() {
        _.bindAll(this, 'render');
        this.render();
    },

    showAdminLogin: function(event) {
        if (event.ctrlKey && admin != true) {
            if ($("#login").length == 0) {
                var login = "<div id='login'><input type='password' /></div>";
                login = $(login);
                var offset = $(event.currentTarget).offset().left
                login.css('left', offset - 100);
                login.css('top', login.height() + 30);
                this.$el.after(login);
                login.find('input')
                    .focus()
                    .blur(this.hideAdminLogin)
                    .bind('keydown', this.submitAdminLogin);
                login.animate({opacity: 0.9}, 400);
            }
        }
        return false;
    },

    hideAdminLogin: function() {
        var login = $("#login");
        login.animate({opacity: 0}, 300);
        setTimeout(function() {
            login.remove();
        }, 310);
        return false
    },

    submitAdminLogin: function(event) {
        if (event.keyCode == 13) {
            var input = $(event.currentTarget);
            input.unbind();
            input.attr('disabled', 'diabled');
            input.css('opacity', 0.5);
            $.ajax({
                url: "/admin/login",
                type: 'post',
                data: {password: input.val()},
                success: function(response) {
                    if (response.status == 'success') {
                        header.hideAdminLogin();
                        admin = true;
                        settings.getAdminSettings();
                    } else {
                        input.val('').removeAttr('disabled').css('opacity', 1);
                        input.focus().blur(header.hideAdminLogin)
                            .bind('keydown', header.submitAdminLogin);
                    }
                }, 
                error: function() {
                    input.css('border-color', 'red');
                }
            });
            return false;
        }
        return true;
    },

    setCounters: function(counters) {
        this.$el.find("#posting_info span").html(counters.posts);
        this.$el.find("#posting_info b").html(counters.online);
    },

    showSettings: function(event) {
        event.preventDefault();
        settings.show();
        return false;
    },

    setFixed: function(bool) {
        if (bool == true) {
            this.$el.css('position', 'fixed');
            section.css('top', '0');
        } else {
            this.$el.css('position', 'relative');
            section.css('top', '-' + (this.$el.height()+8) + 'px');
        }
    },

    render: function() {
        var t = "<h3><a href='/'>" + l.main_title + "</a></h3>"
        t += "<div id='posting_info'>" + l.posts_today + ": <span>0</span>"
        t += ", " + l.online + ": <b>13</b></div>"
        t += "<menu>"
            t += "<li><a href='#' id='tags_link'>" + l.tags + " ↓</a></li>"
            t += "<li><a href='#' id='settings_link'>" + l.settings_title + "</a></li>"
            t += "<li><a id='about_link' href='/about/'>" + l.about + "</a></li>"
            t += "<li><a id='favorites_link' href='/favorites/'>" + l.favorites + "</a></li>"
            t += "<li><a id='live_link' href='/live/'>" + l.live + "</a></li>"
        t += "</menu>"
        this.$el.append(t);
        if ($.browser.chrome) {
            this.$el.find('menu').first().css('margin-right', '10px');
        }
        return this;
    },
});
