var ThreadView = Backbone.View.extend({
    tagName:    'div',
    className:  'thread',
    tagsHidden:  [],
    ridHidden:   false,
    hidden:      false,
    attributes:  {},

    events:     {
        "click .post_header .post_link":    "callReplyForm",
        "click .thread_body a.post_link":   "callReplyForm",
        "click .pic_url":                   "showPicture",
        "click .omitted a":                 "expand",
        "click .fav_button":                "toggleFavorite",
        "click .hide_button":               "toggleHiding",
        "click .video_url":                 "showVideo",
        "click .manage_button":             "showManageMenu",
        "click .edit_button":               "editShow",
        "click .edit_submit":               "editSubmit",
        "click .manage_menu.admin div":     "showAdminFeatures",
        "click #admin_submit":              "submitAdmin",
        "click .delete_button, .delete_file_button": "submitDeletion",
        "mouseenter":                       "showManageButton",
        "mouseleave":                       "hideManageButton",
        "mouseenter .file_container":       "showFileSearch",
        "mouseleave .file_container":       "hideFileSearch",
        'mouseleave .manage_button, .manage_menu': "hideManageMenu",
        'mouseenter .manage_menu': function() {
            mouseOverElement = this;
        },
        "mouseenter blockquote .post_link, .replies_rids .post_link, .proofmark, .context_link": 'showPreview',
        "mouseleave blockquote .post_link, .replies_rids .post_link, .proofmark, .context_link":  'previewLinkOut',
    },

    initialize: function(attributes, model, full) {
        this.model = model;
        this.full = full;
        this.attributes.id = "i" + model.get('rid');
        return this;
    },

    rerender: function() {
        this.render();
        return this;
    },

    updateRepliesCount: function(count) {
        var repliesTotalLink = this.$el.find('.replies_total');
        if (parseInt(settings.get('last_replies')) != 0 || this.className != 'thread' 
            || repliesTotalLink.html() == undefined || action == 'show') {
            return false;
        }
        repliesTotalLink.html(this.verbosePosts(count));
        var seen = settings.get('seen')[this.model.get('rid')];
        var repliesCount = this.$el.find('.replies_count');
        if (seen == undefined) {
            repliesTotalLink.css('font-weight', 'bold');
            return false;
        } else {
            seen = parseInt(seen);
        }
        if (count > seen) {
            var t = ", из них <a href='" + repliesTotalLink.attr('href') + "#new";
            t += "' class='replies_new'>" + this.verbosePosts(count - seen, 'new') + "</a>";
            repliesCount.html(repliesTotalLink[0].outerHTML + t);
        } else if (count == seen) {
            var t = "<a href='" + repliesTotalLink.attr('href') + "' class='replies_total'>"; 
            t += this.verbosePosts(this.model.get('replies_count')) + "</a>";
            repliesCount.html(t);
        }
    },  

    showAdminFeatures: function(event) {
        this.$el.find('p').css('display', 'block');
        $(event.currentTarget).remove();
    },

    submitAdmin: function() {
        data = {rid: this.model.get('rid'), reason: $("admin_reason").val()};
        if ($("#admin_reason").val().length == 0) {
            alert('Укажите причину.');
            return false;
        } else {
            data.reason = $("#admin_reason").val();
        }
        if (this.$el.find("input[name='delete']").attr('checked') == 'checked') {
            data.delete = 'true';
        } 
        if (this.$el.find("input[name='ban']").attr('checked') == 'checked') {
            data.ban = 'true';
            data.ban_days = this.$el.find("input[name='ban_days']").val();
        }
        if (this.$el.find("input[name='change_tags']").attr('checked') == 'checked') {
            data.tags = $("#admin_tags").val();
        }
        $.ajax({
            url:    '/admin/hexenhammer',
            type:   'post',
            data:   data,
            success: function() {
                if (data.ban == 'true') {
                    alert("OK!");
                }
            }, 
            error: router.showError,
        });
        return false;
    },

    submitDeletion: function(event) {
        data = {rid: this.model.get('rid'), password: $('#form_password').val()};
        var post = this;
        if (confirm('Точно удалить?')) {
            if (event.currentTarget.className == 'delete_file_button') {
                data.file = true;
                var element = this.$el.find('.file_container');
                element.css('opacity', '0.3');
            } else {
                var element = this.$el
                element.css('opacity', '0.5');
            }
            $.ajax({
                type: 'post',
                url: '/utility/delete_post',
                data: data,
                success: function(response) {
                    if (response.status != 'success') {
                        element.css('opacity', '1');
                        alert(response.errors);
                    }
                }
            })
        }
    },

    editShow: function(event) {
        var blockquote = this.$el.find('blockquote');
        var textarea = $("<textarea></textarea>");
        textarea.css('width', (blockquote.width() + 10) + "px");
        textarea.css('height', (blockquote.height() + 10) + "px");
        var text = blockquote.html();
        this.initialMessageText = blockquote.html();
        text = text.replace(/<br( \/)*>\s{0,1}/g, "\n");
        text = text.replace(/<i>(.+)?<\/i>/g, "*$1*");
        text = text.replace(/<b>(.+)?<\/b>/g, "**$1**");
        text = text.replace(/<u>(.+)?<\/u>/g, "__$1__");
        text = text.replace(/<s>(.+)?<\/s>/g, "_$1_");
        text = text.replace(/<s>(.+)?<\/s>/g, "_$1_");
        text = text.replace(/<span class="quote">(.+)?<\/span>/g, "$1");
        text = text.replace(/<span class="spoiler">(.+)?<\/span>/g, "%%$1%%");
        var r = /<div class="(post_link|proofmark)"><a href="\/thread\/\d+#i\d+">(&gt;&gt;|##)?(\d+)?<\/a><\/div>/g;
        text = text.replace(r, "$2$3");
        r = /<a href="(.+)?" target="_blank">(.+)?<\/a>/g
        text = text.replace(r, "[$1 || $2]");
        textarea.html(text);
        blockquote.replaceWith(textarea);
        textarea.before("<input type='submit' class='edit_submit' value='сохранить' />");
    },

    editSubmit: function(event) {
        this.$el.find("textarea, .edit_submit")
            .attr('disabled', 'disabled')
            .css('opacity', '0.5');
        var post = this;
        $.ajax({
            url: "/utility/edit_post",
            type: 'post',
            data: {
                rid:        post.model.get('rid'),
                text:       post.$el.find('textarea').val(),
                password:   form.$el.find("#form_password").val(),
            }, 
            success: function(response) {
                post.$el.find(".edit_submit").remove();
                var blockquote = $("<blockquote></blockquote>");
                if (response.status != 'success') {
                    post.$el.find("textarea").replaceWith(blockquote)
                    blockquote.html(post.initialMessageText);
                    alert(response.errors);
                }
            }, 
            error: function() {
                alert('Неизвестная ошибка. Проверьте соединение.');
            }
        });
    },

    showManageMenu: function(event) {
        mouseOverElement = null;
        $(".manage_menu").remove();
        var link = $(event.currentTarget);
        var editable = this.renderDateTime(this.model.get('created_at'), true);
        var t = "<div class='manage_menu'>";
        if (link.hasClass('admin') == true && admin == true) {
            t += "<img src='" + window.base64images.loading + "' /></div>";
            link.after(t);
            $.ajax({
                url:    '/admin/post_info',
                data:   {rid: this.model.get('rid')},
                type:   'post',
                success: function(response) {
                    $(".manage_menu").html(response).addClass('admin');
                }
            });
            return false;
        } else {
            if (editable == true) {
                t += "<div class='edit_button'>редактировать</div>" +
                "<div class='delete_button'>удалить</div>";
                if (this.className != 'thread' && this.model.get('file') != undefined) {
                    t += "<div class='delete_file_button'>удалить файл</div>";
                }
            }
            if (this.$el.hasClass('post_container')) {
                t += "<div class='hide_button'>скрыть</div>";
            }
        }
        t += "</div>";
        if (editable == false && link.hasClass('admin') == false && this.className == 'thread') {
            return false;
        }
        link.after(t);
        return false;
    },

    hideManageMenu: function(event) {
        mouseOverElement = null;
        setTimeout(function() {
            if (mouseOverElement == null) {
                $('.manage_menu').remove();
            }
        }, 400);
        return true;
    },

    showManageButton: function() {
        if (this.isPreview != true) {
            var editable = this.renderDateTime(this.model.get('created_at'), true);
            if (this.className == 'thread' && editable == false && admin == false) {
                return false;
            }
            this.$el.find(".manage_container").css('opacity', 1);
        }
    },

    hideManageButton: function() {
        $('.manage_container').css('opacity', 0);
    },

    showPreview: function(event) {
        return previews.showPreview(event, this.model.get('rid'));
    },

    previewLinkOut: function(event) {
        return previews.previewLinkOut(event);
    },

    showPicture: function(event) {
        var file = this.model.get('file');
        if (file == null) {
            return true;
        }
        if (file.thumb_columns == null) {
            return true;
        } else {
            if (event != undefined) {
                event.preventDefault();
            }
            var img = this.$el.find(".file_container img").first();
            if (img.attr('src') == file.url_small) {
                var max = (document.body.clientWidth - 150);
                var height = file.rows;
                var width = file.columns;
                if (height > max || width > max) {
                    var heightScale = max / height;
                    var widthScale = max / width;
                    if (widthScale > heightScale) {
                        var scale = heightScale;
                    } else {
                        var scale = widthScale;
                    }
                    height *= scale;
                    width *= scale;
                }

                img.attr('width', width).attr('height', height);
                img.attr('src', file.url_full);
                img.css('max-width', (document.body.clientWidth - 100) + "px");
            } else {
                img.attr('width', file.thumb_columns);
                img.attr('height', file.thumb_rows);
                img.attr('src', file.url_small);
            }
            router.adjustFooter();
            return false;
        }
    },

    showAllPictures: function() {
        this.showPicture();
        this.model.posts.each(function(post) {
            post.view.showPicture();
        });
        return false;
    },

    toggleFavorite: function(event) {
        event.preventDefault();
        var rid = this.model.get('rid');
        var link = $(event.currentTarget);
        if (settings.isFavorite(rid) == false) {
            if (settings.toggleFavorite(rid, 'add') == true) {
                link.find('img').attr('src', window.base64images.star_full);
                link.attr('title', 'Убрать из избранного');
            }
        } else {
            settings.toggleFavorite(rid, 'remove');
            link.find('img').attr('src', window.base64images.star_empty);
            link.attr('title', 'Добавить в избранное');
        }
        return false;
    },

    toggleHiding: function(event) {
        event.preventDefault();
        var rid = this.model.get('rid');
        var lastReplies = parseInt(settings.get('last_replies'));
        if (this.className == 'thread') {
            var container = this.$el.parent();    
            var isThread = true;
        } else {
            var container = this.$el;            
            var isThread = false;
        }
        if (settings.isHidden(rid) == false)  {
            settings.hide(rid, isThread);
            if (settings.get('strict_hiding') == true) {
                if (this.className == 'thread') {
                    var next = container.next();
                    if (next.is('hr') == true) {
                        next.remove();
                    }
                }
                container.remove();
            } else {
                this.el.innerHTML = this.renderHidden();
                container.find('.post_container').remove();
                container.removeClass('single');
            }
        } else {
            settings.unhide(rid, isThread);
            this.render();
            if (this.className == 'thread' && parseInt(settings.get('last_replies')) != 0) {
                this.model.posts.each(function(post) {
                    post.view = new PostView({id: 'i' + post.get('rid')}, post);
                    container.append(post.view.render().el);
                });
            }
            if (lastReplies == 0 && action != 'show') {
                container.addClass('single');
            }
        }
        return false;
    },

    scrollTo: function() {
        $.scrollTo(this.$el, 200, {offset: {top: -200}});
        return this;   
    },

    showVideo: function(event) {
        event.preventDefault();
        var url = "https://www.youtube.com/v/" + this.model.get('file')['filename'] + 
        "?version=3&autoplay=1";
        var t = "<object width='320' height='240' class='video'>"
        + "<param name='movie' value='" + url + "'>"
        + "</param><param name='allowScriptAccess' value='always'></param>"
        + "<embed src='" + url + "' type='application/x-shockwave-flash' "
        + "allowscriptaccess='always' width='320' height='240'></embed></object>";
        $(event.currentTarget).replaceWith($(t));
        return false;
    },

    callReplyForm: function(event) {
        event.preventDefault();
        var parentID = this.model.get('thread_rid');
        if (parentID == undefined) {
            parentID = this.model.get('rid');
        }
        form.show(this.model.get('rid'), parentID, 'reply');
        return false;
    },

    showFileSearch: function(event) {
        var video = (this.model.get('file').extension == 'video');
        if (video == true) {
            $(event.currentTarget).find('.play_button').css('opacity', 1);
        } else if (video == false && settings.get('search_buttons') == true) {
            if (this.model.get('file').is_picture == true) {
                var t = "<span class='file_search'>";
                var url = "http://freeport7.org" + this.model.get('file').url_full;
                t += "Поиск: <a href='http://iqdb.org/?url=" + url
                + "' target='_blank'>IQDB</a>";
                t += "</span>";
                $(event.currentTarget).append(t);
            }
        }
        if (settings.get('mamka') == true) {
            $(event.currentTarget).find('img').css('opacity', 1);   
        }
        return false;
    },

    hideFileSearch: function(event) {
        if (settings.get('search_buttons') == true) {
            $('.file_search').remove();
        }
        $('.play_button').css('opacity', 0.7);
        if (settings.get('mamka') == true) {
            $(event.currentTarget).find('img').css('opacity', 0.15);   
        }
        return false;
    },

    renderDateTime: function(datetime, checkEdit) {
        datetime = new Date(datetime);
        var today = new Date();
        if (checkEdit == true) {
            if ((today.getDate() == datetime.getDate() || today.getDate() == datetime.getDate()+1) 
                && today.getMonth() == datetime.getMonth() && today.getFullYear() == datetime.getFullYear()) {
                if (today.getMinutes() > datetime.getMinutes()-1 && today.getMinutes() < (datetime.getMinutes() + 5)) {
                    return true;
                }
                return false;
            }
            return false;
        }
        if (today.getDate() == datetime.getDate() && today.getMonth() == datetime.getMonth()
            && today.getFullYear() == datetime.getFullYear()) {
            var t = "сегодня в ";
        } else if (today.getDate()-1 == datetime.getDate() && today.getMonth() == datetime.getMonth()
            && today.getFullYear() == datetime.getFullYear()) {
            var t = "вчера в ";
        } else {
            var t = datetime.getDate() + " ";
            var monthNames = [  "января",   "февраля",  "марта",  "апреля",   
                                "мая",      "июня",     "июля",   "августа",  
                                "сентября", "октября",  "ноября", "декабря"  ];
            t += monthNames[datetime.getMonth()] + " ";
            t += datetime.getFullYear() + " г. в ";
        }
        var time = [datetime.getHours() + '',
                    datetime.getMinutes() +'',
                    datetime.getSeconds() + '']

        for (var i = 0; i < time.length; i++) {
            if (time[i].length == 1) {
                time[i] = '0' + time[i];
            }
            t += time[i];
            if (i != 2) {
                t += ":";
            }
        }
        return t;
    },

    expand: function(event) {
        event.preventDefault();
        var thread = this;
        var container = thread.$el.parent();
        if (event.currentTarget.innerHTML == 'свернуть тред') {
            for (var i=0; i < thread.posts.length; i++) {
                if (i < thread.posts.length - 6) {
                    thread.posts.at(i).view.$el.remove();
                    delete thread.posts.at(i).view;
                    delete thread.posts.at(i);
                }
            }
            event.currentTarget.innerHTML = thread.verbosePosts(thread.posts.length - 6, 'omitted');
            event.currentTarget.innerHTML += ' спустя:';
        } else {
            event.currentTarget.innerHTML = 'загружаем...';
            $.ajax({
                type: 'post',
                url: '/thread/' + this.model.get('rid') + '/expand',
                success: function(response) {
                    delete thread.posts;
                    container.find('.post_container').remove();
                    thread.posts = new PostsCollection;
                    event.currentTarget.innerHTML = 'свернуть тред';
                    for (var i=0; i < response.posts.length; i++) {
                        var post = new PostModel(response.posts[i]);
                        post.view = new PostView({id: 'i' + post.get('rid')}, post);
                        thread.posts.add(post);
                        container.append(post.view.render().el);
                    }
                    return false;
                },
                error: function() {
                    alert("Неизвестная ошибка. Проверьте соединение.")
                    return false;
                }
            })
        }
        return false;
    },

    renderFileInfo: function(file) {
        var t = "<span class='file_info'>";
        if (file.extension == 'video' && file.video_title != null) {
            t += "Видео: &laquo;<a href='" + file.url_full;
            t += "' target='_blank'>" + file.video_title + "</a>&raquo; ";
            var minutes = parseInt(file.video_duration / 60);
            var seconds = parseInt(file.video_duration - (minutes*60));
            if (seconds < 10) {
                seconds = "0" + seconds;
            }
            t += minutes + ":" + seconds;
        } else {
            t += "Файл: <a href='"  + file.url_full + "' ";
            t += "target='_blank'>" + file.extension + "</a> ";
            t += parseInt(file.size / 1024) + " kb.";
            if (file.is_picture == true) {
                t += " &mdash; " + file.columns + "×";
                t += file.rows;
            }
        }
        t += "</span>";
        return t;
    },

    renderFileContainer: function(file) {
        var t = "<div class='file_container'>";
        t += "<a target='_blank' href='" + file.url_full + "' ";
            if (file.extension == 'video') {
                t += "class='video_url'>";
            } else {
                if (file.is_picture == true) {
                    t += "class='pic_url'>";
                } else {
                    t += "class='non_pic_url'>";
                }
            }
            if (file.extension == 'video') {
                t += "<img src='/assets/ui/play.png' class='play_button' />";
            }
            t += "<img src='" + file.url_small + "' ";
            if (settings.get('mamka') == true) {
                t += 'style="opacity: 0.2;" ';
            }
            if (file.thumb_rows != null) {
                t += "width=" + file.thumb_columns;
                t += " height=" + file.thumb_rows;
            } else if (file.extension == 'video') {
                t += "width=" + 320;
                t += " height=" + 240;
            } else {
                t += "width=" + file.columns;
                t += " height=" + file.rows;
            }
            t += "/>";
        t += "</a>";
        t += "</div>";
        return t;
    },

    renderRepliesRids: function(rids) {
        var t = "<div class='replies_rids'>";
            t += "Ответы: ";
            for (var i = 0; i < rids.length; i++) {
                t += "<div class='post_link'>";
                t += "<a href='/thread/" + rids[i].thread + "#i" + rids[i].post;
                t += "' >&gt;&gt;" + rids[i].post + "</a>";
                t += "&nbsp;</div>"
            }
        t += "</div>";
        return t;
    },

    verbosePosts: function(number, type) {
        if (number == 0) {
            return "нет постов";
        }
        var result = number + ' пост';
        var mod = number % 10;
        var mod2 = number % 100;
        if (type == 'new') {
            result = number + " новы";
            if (mod == 1 && mod2 != 11) {
                result += "й";
            } else {
                result += 'х';
            }
        } else 
            if ((mod >= 2 && mod <= 4) && !(mod2 >= 12 && mod2 <= 14)) {
                result += 'а';
            } else if (mod != 1 || number == 11) {
                result += 'ов';
            }
        return result;
    }, 

    renderTagList: function(tags) {
        var t = "<span class='taglist'>тэг";
        if (tags.length > 1) {
            t += "и";
        }
        t += ": ";
            for (var i=0; i < tags.length; i++) {
                t += "<a href='/" + tags[i].alias + "/' ";
                t += "title='/" + tags[i].alias + "/'>" + tags[i].name + "</a>";
                if (i != (tags.length - 1)) {
                    t += ",";
                }
                t += " ";
            }
        t += "</span>";
        return t;
    },

    renderHidden: function() {
        var t = "<div class='thread_body hidden'>Скрытый тред ";
        var url = "/thread/" + this.model.get('rid');
        t += "<a href='" + url + "'>#" + this.model.get('rid') + "</a>";
        t += " (";
        if (this.model.get('title').length > 0) {
            t += this.model.get('title');
        } else {
            t += "без названия";
        }
        t += "), ";
        t += this.renderTagList(this.model.get('tags'));
        if (this.tagsHidden.length == 0) {
            t += "<a href='#' title='Показать' class='hide_button'>";
                t += "<img src='" + window.base64images.unhide + "' />";
            t += "</a>";
        } else {
            t += " (вашими настройками скрыт";
            if (this.tagsHidden.length == 1) {
                t += " тэг ";
            } else {
                t += "ы тэги ";
            }
            for (var i=0; i < this.tagsHidden.length; i++) {
                t += this.tagsHidden[i].name;
                if (i != this.tagsHidden.length-1) {
                    t += ", ";
                }
            }
            t += ")";
        }
        t += "</div>";
        return t;
    },

    render: function() {
        if (action != 'show') {
            this.ridHidden = settings.isHidden(this.model.get('rid'));
            var tagsHidden = [];
            this.model.get('tags').forEach(function(tag) {
                if (settings.isHidden(tag.alias) == true && tag.alias != currentTag) {
                    tagsHidden.push(tag);
                }
            }); 
            this.tagsHidden = tagsHidden;
            if (this.ridHidden == true || this.tagsHidden.length > 0) {
                this.hidden = true;
                this.el.innerHTML = this.renderHidden();
                return this;
            }
        }
        var t = "<div class='thread_body'>";
        var lastReplies = parseInt(settings.get('last_replies'));
            if (this.model.get('file') != null) {
                if (!(action != 'show' && lastReplies == 0))  {
                    t += this.renderFileInfo(this.model.get('file'));
                }
                t += this.renderFileContainer(this.model.get('file'));
            }
            var url = '/thread/' + this.model.get('rid');             
            t += "<a href='#' class='fav_button' ";
                if (settings.isFavorite(this.model.get('rid')) == true)  {
                    var star = window.base64images.star_full;
                    t += "title='Убрать из избранного'>";
                } else {
                    var star = window.base64images.star_empty;
                    t += "title='Добавить в избранное'>";
                }
                t += "<img src='" + star + "' />";
            t += "</a>";
            if (action != 'show') {
                t += "<a href='#' title='Скрыть' class='hide_button'>";
                    t += "<img src='" + window.base64images.hide + "' />";
                t += "</a>";
            }
            if (this.model.get('title') != '') {
                t += "<a href='/thread/" + this.model.get('rid') + "' class='title'>";
                t += this.model.get('title');
                t += "</a>";
            }
            t += "<a href='" + url + "' class='post_link'>#" + this.model.get('rid');
            t += "</a>";
            t += "<span class='thread_info'>";
                t += this.renderDateTime(this.model.get('created_at'));
                if (!(lastReplies == 0 && action != 'show')) {
                    t += ', ' + this.renderTagList(this.model.get('tags'));
                }
                t += "<div class='manage_container'><span class='manage_button'>×</span>";
                if (admin == true) {
                    t += "<span class='manage_button admin'>!</span>";
                }
                t += "</div>";
            t += "</span>";
            t += "<blockquote>" + this.model.get('message') + "</blockquote>";
            if (this.model.get('replies_rids').length > 0) {
                if (lastReplies == 0 && action == 'index') {
                    // bydlocode!
                } else {
                    t += this.renderRepliesRids(this.model.get('replies_rids'));
                }
            }
        t += "</div>";
        if (lastReplies != 0) {
            if (this.model.posts != undefined && action != 'live') {
                if (this.full != true && this.model.get('replies_count') > this.model.posts.length) {
                    t += "<div class='omitted'><a href='" + url + "' title='развернуть тред'>" 
                    t += this.verbosePosts(this.model.get('replies_count') - lastReplies, 'omitted');
                    t += " спустя:</a></div>";
                }
            }
        } else {
            if (action != 'show') {
                t += "<hr /><div class='thread_bottom'>";
                    t += "<div class='replies_count'>";
                        t += "<a href='" + url + "' class='replies_total'>"
                            t += this.verbosePosts(this.model.get('replies_count'));
                        t += "</a>";
                    t += "</div>";
                    t += this.renderTagList(this.model.get('tags'));
                t += "</div>"
            }
        }
        this.el.innerHTML = t;
        if (lastReplies == 0) {
            this.updateRepliesCount(this.model.get('replies_count'));
        }
        return this;
    }
});




var PostView = ThreadView.extend({
    tagName:    'div',
    className:  'post_container',
    el:         '',
    isPreview:  false,

    initialize: function(attributes, model) {
        this.model = model;
        this.attributes.id = "i" + model.get('rid');
        this.$previews = $('#previews').first();
        return this;
    },

    highlight: function() {
        $('.post.highlighted').removeClass('highlighted');
        this.$el.find('.post').first().addClass('highlighted');
        return this;
    },

    renderHidden: function() {
        var t = "<div class='post_hidden'>скрытый пост" +
        "<img src='" + window.base64images.unhide + "' class='hide_button' /> </div>";
        return t;
    },

    render: function(updateReferences, isPreview) {
        this.ridHidden = settings.isHidden(this.model.get('rid'));
        if (this.ridHidden == true && isPreview != true) {
            if (settings.get('strict_hiding') == true) {
                this.el.innerHTML = "";
            } else {
                this.el.innerHTML = this.renderHidden();
            }
            return this;
        }

        var url = "/thread/"; 
        if (this.model.get('thread_rid') != undefined) {
            url += this.model.get('thread_rid');
        } else {
            url += this.model.get('rid');
        }
        url += "#i" + this.model.get('rid');
        var t = "<div class='post'>";
        t += "<div class='post_header'>";
            t += "<span><a href='" + url + "' class='post_link'>";
            t += "#" + this.model.get('rid') + "</a></span>";
            t += "<span class='title'>" + this.model.get('title') + "</span>";
            t += "<span class='date'>" + this.renderDateTime(this.model.get('created_at')) + "</span>";
            if (this.model.get('sage') == true) {
                t += "<span class='sage'>sage</span>";
            }
            if (this.model.get('file') != null) {
                t += this.renderFileInfo(this.model.get('file'));  
            }
            if (action == 'live' && this.model.get('thread_title') != undefined && isPreview != true) {
                t += "<a href='/thread/" + this.model.get('thread_rid') + "' class='context_link'>" + 
                this.model.get('thread_title') + "</a>";
            }
            t += "<div class='manage_container'><span class='manage_button'>×</span>";
            if (admin == true) {
                t += "<span class='manage_button admin'>!</span>";
            }
            t += "</div>";
        t += "</div>";
        t += "<div class='post_body'>";
            if (this.model.get('file') != null) {
                t += this.renderFileContainer(this.model.get('file'));  
            }
            t += "<blockquote>" + this.model.get('message') + "</blockquote>";
            if (this.model.get('replies_rids').length > 0) {
                t += this.renderRepliesRids(this.model.get('replies_rids'));
            }
        t += "</div></div>";
        this.el.innerHTML = t;
        if (settings.get('shadows') == true) {
            this.el.firstChild.style.boxShadow = "0 1px 3px #d7d7d7";
            this.el.firstChild.style.margin = "3px 0px 3px 0px";
        }
        if (updateReferences == true) {
            var model = this.model;
            $.each(this.$el.find('blockquote .post_link'), function(index, div) {
                var postId = $(div).find('a').first().attr('href').split('#');
                postId = parseInt(postId[postId.length - 1].substring(1));
                var target = router.getPostLocal(postId);
                if (target != null) {
                    var rids = target.get('replies_rids');
                    for (var i = 0; i < rids.length; i++) {
                        if (rids[i].post == model.get('rid')) {
                            return this;
                            break;
                        }
                    }
                    rids.push({thread: model.get('thread_rid'), post: model.get('rid')});
                    target.set('replies_rids', rids);
                    var post = target.view.$el;
                    rids = post.find('.replies_rids').first();
                    var content = "&gt;&gt;" + model.get('rid');
                    var link = "<div class='post_link'><a href='/thread/" + model.get('thread_rid');
                    link += '#i' + model.get('rid') + "'>" + content + "</a></div>";
                    if (rids.html() == undefined) {
                        rids = $("<div class='replies_rids'>Ответы: " + link + "</div>");
                        post.find('blockquote').first().after(rids);
                    } else if (rids.html().search(content) == -1) {
                        rids.append(' ' + link);
                    }
                }
            });
        }
        return this;
    }
});