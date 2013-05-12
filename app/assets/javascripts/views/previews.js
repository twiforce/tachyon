var PreviewsView = Backbone.View.extend({
    tagName:    'div',
    id:         'previews',
    current:    null,

    initialize: function() {
        _.bindAll(this, 'render');
        this.render();
        this.cache = new PostsCollection;
    },

    offset: function(element, xy) {
        var c = 0;
        while (element) {
            c += element[xy];
            element = element.offsetParent;
        }
        return c;
    },

    showPreview: function(event, fromPostId) {
        var link = $(event.currentTarget);
        this.current = link;
        if (link.hasClass('context_link')) {
            var postRid = link.attr('href').split('/');
            postRid = postRid[postRid.length-1];
            link = link[0];
        } else {
            link = link.find('a')[0];
            var postRid = link.hash.match(/\d+/);
        }
        var screenWidth = document.body.clientWidth;
        var screenHeight = window.innerHeight;
        var previewX = this.offset(link, 'offsetLeft') + link.offsetWidth / 2;
        var previewY = this.offset(link, 'offsetTop');
        if (event.clientY < (screenHeight * 0.75)) {
            previewY += link.offsetHeight;
        }
        var preview = new Preview;
        var style = 'position:absolute; z-index:5;';
        if (previewX < screenWidth / 2) {
            style += 'left:' + previewX + 'px; ';
        } else {
            style += 'right:' + parseInt(screenWidth - previewX + 2)  + 'px; ';
        }
        if (event.clientY < screenHeight * 0.75) {
            style += 'top:' + previewY + 'px; ';
        } else {
            style += 'bottom:' + parseInt(screenHeight - previewY - 4) + 'px; '
        }
        preview.$el.attr('style', style);
        preview.postRid = fromPostId;
        this.$el.append(preview.$el);
        var leftSibling = preview.$el.prev();
        if (leftSibling.html() != undefined) {
            if (leftSibling.data('view').postRid == fromPostId) {
                this.removePreview(leftSibling);
            }
        }
        previews.getPost(postRid, preview);
        return false;
    },


    previewLinkOut: function(event) {
        var link = $(event.currentTarget);
        var father = link.parentsUntil('.thread, .post_container').last().parent().parent();
        if (father.hasClass('preview')) {
            previews.current = father;
            setTimeout(function() {
                previews.removePreview(father, true)
            }, 190);
        } else {
            previews.current = null;
            setTimeout(function() {
                if (previews.current == null) {
                    previews.removePreview('all');
                }
            }, 190);
        }
        return false;
    },

    previewOver: function(event) {
        previews.current = $(event.currentTarget);
        return false;
    },

    previewOut: function(event) {
        previews.current = null;
        setTimeout(function() {
            if (previews.current == null) {
                previews.removePreview('all');
            } else {
                previews.removePreview(previews.current, true);
            }
            return false;
        }, 300);
        return false;
    },

    getPost: function(postRid, preview) {
        postRid = parseInt(postRid);
        var post = router.getPostLocal(postRid, true);
        if (post != null) {
            this.showPost(post, preview);
        } else {
            router.getPostRemote(postRid, function(remotePost) {
                if (remotePost == null) {
                    preview.notFound();
                } else if (remotePost == false) {
                    preview.error();
                } else {
                    if (previews.cache.where({rid: remotePost.get('rid')}).length == 0) {
                        previews.cache.add(remotePost);
                    }
                    if (previews.cache.size() > 10)  {
                        previews.cache.shift().terminate();
                    }
                    previews.showPost(remotePost, preview);
                }
            });
        }
        return false;
    },

    showPost: function(post, preview) {
        post.view = new PostView({id: 'i' + post.get('rid')}, post);
        post.view.isPreview = true;
        var element = post.view.render(false, true).$el;
        post.preview = preview;
        preview.render(element);
        preview.$el.css('opacity', 0.4)
        preview.$el.animate({opacity: 1}, 300);
        return false;
    },

    removePreview: function(preview, rightSiblings) {
        if (preview == 'all') {
            $.each($('#previews .preview'), function(index, preview) {
                previews.removePreview($(preview));
            });
        } else {
            if (rightSiblings == true) {
                var procceed = true;
                if (previews.current != null) {
                    if (!previews.current.hasClass('preview')) {
                        return false;
                    }
                } else {
                    return false;
                }
                while (procceed == true) {
                    var sibling = previews.current.next();
                    if (sibling.html() != undefined) {
                        previews.removePreview(sibling);
                    } else {
                        procceed = false;
                    }
                }
            } else {
                delete preview.data('view');
                preview.remove();
            }
        }
        return false;
    },
});


var Preview = Backbone.View.extend({
    tagName:    'div',
    className:  'preview',

    events: {
        "mouseenter": "over",
        "mouseleave": "out",
    },

    initialize: function() {
        _.bindAll(this, 'render');
        this.render();
        return this;
    },

    render: function(element) {
        if (element == undefined) {
            this.el.innerHTML = "<p>" + l.loading + "...</p>";
        } else {
            this.$el.html(element);
        }
        this.$el.data('view', this);
        return this;
    },

    over: function(event) {
        return previews.previewOver(event);
    },

    out: function(event) {
        return previews.previewOut(event);
    },

    notFound: function() {
        this.$el.html("<p>" + l.errors.not_found.post + "</p>");
        return this;
    },

    error: function() {
        this.$el.html("<p>" + l.error + "</p>");
        return this;
    }
});