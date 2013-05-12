//= require jquery
//= require jquery_ujs
//= require underscore
//= require backbone
//= require fayer
//= require fields
//= require caret
//= require scrollto

//= require i18n
//= require models
//= require settings
//= require views/images
//= require views/bottom_menu
//= require views/form
//= require views/head
//= require views/paginator
//= require views/previews
//= require views/taglist
//= require views/thread_and_post

var settings, header, tagList, cometSubscription, previousPath,
section, bottomMenu, loadingTimeout, threadsCollection, connectionFailedTimeout,
livePostsCollection, currentTag, mobileLink, mouseOverElement = null;
var admin = false;
var versionMismatchAlerted = false;

$(document).ready(function() {
var MainRouter = Backbone.Router.extend({
    routes: {
        '':                     'toRoot',
        'live/':                'live',
        'live':                 'trailingSlash',
        'about':                'trailingSlash',
        'about/':               'about',
        'about/:action':        'about',
        'thread/:rid':          'show',
        ':rid.html':            'showOldHack',
        ':tag/':                'index',
        ':tag':                 'trailingSlash',
        ':tag/page/:page':      'showPage',
        '*path':                'notFound'
    }, 

    setTitle: function(title) {
        var set = l.short_title;
        if (production == false) {
            set += " dev ";
        }
        if (title != undefined) {
            set += " - " + title;
        }
        document.title = set;
        return false;
    },

    before: function(response) {
        section.removeAttr('style');
        controller = null;
        action = null;
        form.hide();
        form.setTag('');
        settings.close();
        header.$el.find(".active").removeClass('active');
        tagList.$el.find(".selected").removeClass('selected');
        if (response.status == 'not found') {
            this.notFound();
            return false;
        } else if (response.status == 'fail') {
            this.showError(response);
            return false;
        }
        if (cometSubscription != null) {
            cometSubscription.cancel();
            cometSubscription = null;
        }  
        var href = "http://m." + document.location.host + document.location.pathname;
        mobileLink.attr('href', href);
        if (threadsCollection != undefined) {
            threadsCollection.terminate();
            threadsCollection = undefined;
        }
        if (livePostsCollection != undefined) {
            livePostsCollection.terminate();
            livePostsCollection = undefined;
        }
        return true;
    },

    trailingSlash: function() {
        this.navigate(document.location.pathname + "/", {trigger: true});
    },

    toRoot: function() {
        this.navigate("/~/", {trigger: true});
        return false;
    },

    index: function(tag) {
        this.showPage(tag, 1);
        return false;
    },

    showOldHack: function(rid) {
        hash = document.location.hash;
        this.navigate("/thread/" + rid + hash, {trigger: true});
        hideLoadingIndicator();
        return false;
    },

    about: function() {
        showLoadingIndicator();
        $.ajax({
            type: 'post',
            url: document.location,
            success: function(response) {
                if (router.before(response) == false) {
                    return false;
                }
                controller = 'about'; action = 'about';
                bottomMenu.vanish();
                router.setTitle(l.about);
                hideLoadingIndicator();
                header.$el.find('#about_link').addClass('active');
                section.html(response);
                router.adjustFooter();
            }
        })
    },

    live: function() {
        showLoadingIndicator();
        $.ajax({
            type:       'post',
            url:        document.location,
            success:    function(response) {
                if (router.before(response) == false) {
                    return false;
                }
                router.setTitle('LIVE!');
                controller = 'threads'; action = 'live';
                form.targetOn('create');
                var liveContainer = $("<div id='live_container'></div>");
                section.html(liveContainer);
                hideLoadingIndicator();
                header.$el.find('#live_link').addClass('active');
                window.scrollTo(0, 0);
                livePostsCollection = new PostsCollection;
                threadsCollection = new ThreadsCollection;
                response.messages.forEach(function(model) {
                    router.addPostLive(model, false);
                });
                cometSubscription = cometClient.subscribe('/live', router.addPostLive);
                router.adjustFooter();
                return false;
            },
            error: router.showError, 
        });
        return false;
    },

    addPostLive: function(postJson, updating) {
        if (updating == undefined) {
            updating = true;
        }
        var container = $("#live_container");
        if (postJson.tags != undefined) {
            var thread = router.buildThread(postJson, false);
            thread.container.addClass('live');
            container.prepend(thread.container);
            threadsCollection.add(thread.model);
        } else {
            var post = new PostModel(postJson);
            post.view = new PostView({id: 'i' + post.get('rid')}, post);
            livePostsCollection.add(post);
            container.prepend(post.view.render(updating).el);
            post.view.$el.addClass('live');
        }
        if (updating == true) {
            var last = $(".live");
            if (last.length < 15) {
                return false;
            }
            last = last.last();
            if (last.hasClass('post_container')) {
                livePostsCollection.shift().terminate();
            } else {
                threadsCollection.shift().terminate();
            }
        }
        return false;
    },

    show: function(rid) {
        rid = rid.replace('#new', '');
        showLoadingIndicator();
        $.ajax({
            type:       'post',
            url:        document.location,
            success:    function(response) {
                if (router.before(response) == false) {
                    return false;
                }
                if (response.thread.title.length > 0) {
                    var title = response.thread.title;
                } else {
                    var title = l.thread + " №" + response.thread.rid;
                }
                title += " (";
                for (var i=0; i < response.thread.tags.length; i++) {
                    title += response.thread.tags[i].name;
                    if (i != response.thread.tags.length-1) {
                        title += ", ";
                    }
                }
                router.setTitle(title + ")");
                controller = 'threads'; action = 'show';
                form.targetOn('reply', rid);
                section.html('');
                hideLoadingIndicator();
                window.scrollTo(0, 0);
                var thread = router.buildThread(response.thread, true);
                section.append(thread.container);
                threadsCollection = new ThreadsCollection([thread.model]);
                var seen = settings.get('seen');
                seen[parseInt(thread.model.get('rid'))] = thread.model.get('replies_count');
                settings.set('seen', seen);
                cometSubscription = cometClient.subscribe('/thread/' + rid, router.addPost);
                var buttons = "<div class='thread_buttons'><a href='/~/' class='back_link'>← " + l.back + "</a>" 
                + "<a href='#' class='show_all_pictures_button'>" + l.expand_pictures + "</a></div>";
                thread.container.before(buttons);
                thread.container.after(buttons);
                $('.show_all_pictures_button').unbind().click(function(event) {
                    event.preventDefault();
                    var threadToShowPictures = threadsCollection.first().view;
                    threadToShowPictures.showAllPictures();
                    return false;
                });
                if (previousPath != null) {
                    $('.back_link').attr('href', previousPath);
                }
                checkHash();
                thread.model.updateRepliesCount(thread.model.get('replies_count'))
                router.adjustFooter();
                return false;
            },
            error: router.showError,
        });
        return false;
    },

    showPage: function(tag, page) {
        showLoadingIndicator();
        page = parseInt(page);
        var link = '/' + tag;
        if (page != 1) {
            link += '/page/' + page;
        }
        var data = {amount: settings.get('threads_per_page'), order: settings.get('order')};
        if (tag == 'favorites') {
            data.rids = settings.get('favorites');
        }
        if (settings.get('strict_hiding') == true) {
            data.hidden_posts = settings.get('hidden_threads');
            data.hidden_tags  = settings.get('hidden_tags' );
        }
        $.ajax({
            type: 'post',
            url:  document.location,
            data: data,
            success: function(response) {
                if (router.before(response) == false) {
                    return false;
                }
                controller = 'threads'; action = 'index';
                form.targetOn('create');
                form.setTag('');
                header.$el.find("#tags_link").addClass('active');
                if (tag == '~') {
                    tagList.$el.find("#overview_tag").addClass('selected');
                    router.setTitle(l.overview);
                } else if (tag == 'favorites') {
                    header.$el.find(".active").removeClass('active');
                    header.$el.find("#favorites_link").addClass('active');
                    router.setTitle(l.favorites);
                } else {
                    var tagElement = tagList.$el.find("#" + tag);
                    tagElement.addClass('selected');
                    form.setTag(tag);
                    router.setTitle(tagElement.html());
                }
                currentTag = tag;
                var threads = [];
                section.html('');
                hideLoadingIndicator();
                window.scrollTo(0, 0);
                var lastReplies = parseInt(settings.get('last_replies'));
                for (var i=0; i < response.threads.length; i++) {
                    var thread = router.buildThread(response.threads[i], false);
                    section.append(thread.container);
                    threads[i] = thread.model;
                    if (i != response.threads.length-1 && lastReplies != 0) {
                        section.append("<hr />");
                    }
                }
                if (lastReplies == 0) {
                    section.attr('style', "max-width: 1050px; margin: 0 auto; margin-top: 70px")
                }
                threadsCollection = new ThreadsCollection(threads);
                if (threadsCollection.length == 0) {
                    section.prepend('<div class="emptiness">' + l.emptiness + '</div>')   
                }
                if (response.pages != undefined) {
                    section.append(paginator.render(response.pages, page, tag).el);
                }
                router.adjustFooter();
                return false;
            },
            error: router.showError,
        });
        return false;
    },

    buildThread: function(thread_json, full) {
        var thread = new ThreadModel(thread_json);
        thread.view = new ThreadView({id: 'i' + thread.get('rid')}, thread, full);
        if (full == true) {
            var container = $("<div id='thread_container'></div>");
        } else {
            var container = $("<div class='thread_container'></div>");
        }
        container.append(thread.view.render().el);
        var lastReplies = parseInt(settings.get('last_replies'));
        var seen = settings.get('seen');
        var newPlaced = false;
        if (thread.view.hidden == false && (lastReplies != 0 || action == 'show')) {
            for (var i = 0; i < thread.posts.length; i ++) {
                var post = thread.posts.at(i);
                post.view = new PostView({id: 'i' + post.get('rid')}, post);
                if (lastReplies == 0) {
                    if ((i+1) > (parseInt(seen[thread.get('rid')])) && newPlaced == false) {
                        container.append("<div id='new'>" + l.new_posts + ":</div>");
                        newPlaced = true;
                    }
                }
                container.append(post.view.render().el);
            }
        }
        if (lastReplies == 0 && action != 'show') {
            if (container.find('.hidden').html() == undefined) {
                container.addClass("single");
            }
        }
        return { container: container, model: thread }
    },

    addPost: function(post_json, scroll, update) {
        var post = new PostModel(post_json);
        var thread = threadsCollection.where({rid: post.get('thread_rid')})[0];
        thread.posts.add(post);
        post.view = new PostView({id: 'i' + post.get('rid')}, post);
        thread.view.$el.parent().append(post.view.render(true).el);
        if (scroll == true) {
            router.highlightPost(post.get('rid'), settings.get('scroll_to_post'));
        }
        setTimeout(function() {
            var seen = settings.get('seen');
            seen[parseInt(thread.get('rid'))] = thread.get('replies_count');
            settings.set('seen', seen);
            thread.updateRepliesCount(parseInt(thread.get('replies_count')));
        }, 300);
        router.adjustFooter();
        return false;
    },

    highlightPost: function(rid, scroll) {
        rid = parseInt(rid);
        var test = $("#i" + rid);
        if (test.length == 0) {
            setTimeout(function() {
                router.highlightPost(rid);
            }, 100);
        } else {
            $(".highlighted").removeClass('highlighted');
            test.find('.post').addClass('highlighted');
            if (scroll != false) {
                $.scrollTo(test, 150, {offset: {top: -200}, easing: 'linear'});
            }
            // if (action == 'show') {
            //     document.location.hash = 'i' + rid;
            // }
        }
        return false;
    },

    notFound: function() {
        controller = 'application'; action = 'not_found';
        var t = "<div class='not_found'><h1>404</h1>";
        t += "<span>" + l.errors.not_found.link + "</span></div>";
        section.html(t);
        bottomMenu.vanish();
        hideLoadingIndicator();
        router.adjustFooter();
        return this;
    },

    showError: function(response) {
        if (response == undefined) {
            var errors = [l.errors.unknown];
        } else {
            if (response.errors != undefined) {
                var errors = response.errors;
            } else {
                var errors = [response.responseText];
            }
        }
        controller = 'application'; action = 'error';
        bottomMenu.vanish();
        hideLoadingIndicator();
        section.html('<h1>' + l.error + ':</h1>');
        errors.forEach(function(error) {
            section.append('<br />' + error); 
        });
        router.adjustFooter();
        return this;
    },

    adjustFooter: function() {
        if (mainContainer.height() < (window.innerHeight - 150)) {
            $('footer').css({position: 'absolute', bottom: 0});
        } else {
            $('footer').css({position: 'static', bottom: 'none'});
        }
        return false;
    },

    getPostLocal: function(postRid, clone, getCollection) {
        postRid = parseInt(postRid);
        var collections = [threadsCollection, previews.cache, livePostsCollection];
        threadsCollection.forEach(function(thread) {
            collections.push(thread.posts);
        });
        for (var i = 0; i < collections.length; i++) {
            if (collections[i] != null) {
                var query = collections[i].where({rid: postRid});
                if (query.length > 0) {
                    if (query[0].deleted != true) {
                        if (clone == true) {
                            return query[0].clone();
                        } else if (getCollection == true) {
                            return collections[i];
                        } else {
                            return query[0];
                        }
                    }
                }
            }
        }
        return null;
    },

    getPostRemote: function(postRid, callback) {
        var post = null;
        $.ajax({
            url: '/utility/get_post',
            type: 'post',
            async: true,
            data: {rid: postRid},
            success: function(response) {
                if (response.post != null) {
                    post = new PostModel(response.post);
                } 
                callback(post);
            },
            error: function() {
                callback(false);
            }
        });
        return false;
    },
});


/////////////////////////////////////////////////////////////////////


function showTagList() {
    mouseOverElement = $(this);
    tagList.$el.animate({top: 0}, 300);
    return false;
}


function hideTagList() {
    mouseOverElement = null;
    setTimeout(function() {
        if (mouseOverElement == null) {
            tagList.$el.animate({top: -(tagList.$el.height() + 50)}, 300);
        }
    }, 300);
    return false;
}

function setMouseOver() {
    mouseOverElement = $(this);
    return false;
}

function showLoadingIndicator() {
    router.setTitle('...');
    loadingTimeout = setTimeout(function () {
        loadingIndicator.css('display', 'block');
        loadingIndicator.css('opacity', '0.9');
    }, 450);
}

function hideLoadingIndicator() {
    if (loadingTimeout != null) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
    }
    setTimeout(function() {
        loadingIndicator.animate({opacity: 0}, 300);
        setTimeout(function() {
            loadingIndicator.css('display', 'none');
            if (loadingIndicator.attr('src') != window.base64images.loading) {
                loadingIndicator.attr('src', window.base64images.loading);
            }
        }, 350);
    }, 100);
    return false;
}

function adjustAbsoluteElements() {
    tagList.adjust();
    settings.adjust();
    router.adjustFooter();
}

function checkHash() {
    if (document.location.hash != '') {
        if (document.location.hash == '#new') {
            var neww = $("#new");
            if (neww.html() != undefined) {
                $.scrollTo($("#new"), {offset: {top: -100}});
            }
        }
        var post = threadsCollection.first().posts.where({
            rid: parseInt(document.location.hash.substring(2)),
        })[0];
        if (post != undefined) {
            router.highlightPost(post.get('rid'));
        }
    }
}



/////////////////////////////////////////////////////////////////////

function initializeInterface() {
    settings.renderTags(tagList.renderTagTable(5, true));
    mainContainer = $('#main_container');
    loadingIndicator = $("#loading");
    router = new MainRouter;
    form = new FormView;
    bottomMenu = new BottomMenuView;
    paginator = new PaginatorView;
    previews = new PreviewsView;

    mainContainer.append(tagList.el);
    mainContainer.append(header.el);
    mainContainer.append(bottomMenu.el);
    mainContainer.append(form.el);
    if ($.browser.opera) {
        form.adjustTopForOperagovno();
    }
    mainContainer.append(previews.el);
    mainContainer.append(settings.el);
    mainContainer.after("<div id='connection_failed'>" + l.errors.connection + "</div>");
    section = $("<section id='container'></section>");
    var footer = '<footer>Tachyon ' + VERSION
    footer += "<a id='mobile_link' href='http://m." + document.location.host 
    + "'>" + l.mobile_version + "</a></footer>";
    mainContainer.append(section).append(footer);
    mobileLink = $("#mobile_link");
    header.setFixed(settings.get('fixed_header'));
    adjustAbsoluteElements();
    $(window).resize(adjustAbsoluteElements);
    header.$el.find("#tags_link").hover(showTagList, hideTagList);
    tagList.$el.hover(setMouseOver, hideTagList);
    header.setCounters(tagList.counters);

    $("#loading_container blockquote").remove();
    loadingIndicator.css('z-index', '20');
    Backbone.history.start({pushState: true});

    $(document).on('click', "a[href^='/']", function(event) {
        var href = $(event.currentTarget).attr('href');
        if (href.substring(1,8) == 'utility') {
            return true;
        }
        var click = (!event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey);
        click = click && (href.substring(0, 6) != '/files');
        if (click == true) {
            event.preventDefault();
            previousPath = document.location.pathname + document.location.hash;
            router.navigate(href, {trigger: true});
        }
    });
    cometClient = new Faye.Client('/comet', {
        timeout: 58,
        retry: 2
    });
    cometClient.disable('websoket');
    cometClient.bind('transport:down', function() {
        connectionFailedTimeout = setTimeout(function() {
            $("#connection_failed").css('display', 'table');
        }, 2500);
    });
    cometClient.bind('transport:up', function() {
        if (connectionFailedTimeout != null) {
            clearTimeout(connectionFailedTimeout);
            connectionFailedTimeout = null;
        }
        $("#connection_failed").css('display', 'none');
    });
    var countersSubscription = cometClient.subscribe('/counters', function(message) {
        header.setCounters(message);
        if (message.post != undefined) {
            var collection = router.getPostLocal(message.post.rid, undefined, true);
            if (collection != null) {
                for (var i = 0; i < collection.length; i++) {
                    if (collection.at(i).get('rid') == parseInt(message.post.rid)) {
                        collection.at(i).set(message.post);
                        collection.at(i).view.rerender();
                        return false;
                    }
                }
            }
        } else if (message.delete != undefined) {
            var post = router.getPostLocal(message.delete);
            if (post != null) {
                post.deleted = true;
                post.terminate();  
            }
        }
        if (message.replies != undefined) {
            var thread = router.getPostLocal(parseInt(message.replies[0]));
            if (thread != null) {
                thread.updateRepliesCount(parseInt(message.replies[1]));
            }
        }
        if (message.version != undefined) {
            if (message.version != VERSION && versionMismatchAlerted == false) {
                alert(l.site_updated);
                versionMismatchAlerted = true;
                $("footer").css('color', 'red');
            }
        }
        return false;
    });

    setInterval(function() {
        $.post('/utility/ping');
    }, 60000)
}

settings = new SettingsView;
header = new HeaderView;
tagList = new TagListView(initializeInterface);
});
