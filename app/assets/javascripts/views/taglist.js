var TagListView = Backbone.View.extend({
    tagName:    'div',
    id:         'taglist',
    el:         '',
    tagsArray:  [],

    initialize: function(callback) {
        _.bindAll(this, 'render');
        this.callback = callback;
        this.render();
    },

    renderTagTable: function(inRow, checkbox) {
        var tags = this.tagsArray.slice(0);
        var rows = parseInt(tags.length / inRow) + 1;
        var t = "<table class='tags_table'";
        if (checkbox == true) {
            t += " cellspacing='15'";
        }
        t += ">";
        for (var i = 0; i < rows; i++) {
            t += "<tr>";
            var array = [];
            for (var a = 0; a < inRow; a++) {
                array.push(tags[a]);
            }
            array.forEach(function(tag) {
                t += "<td>";
                if (tag != undefined) {
                    var currentTag = tags.pop();
                    var link = "/" + currentTag.alias + "/";
                    if (checkbox == true) {
                        t += "<label><input type='checkbox' class='hide_tag' name='" +
                        currentTag.alias + "' ";
                        if (settings.isHidden(currentTag.alias) == true) {
                            t += "checked='checked' ";
                        }
                        t += "/> " + currentTag.name + "</label>";
                    } else {
                        t += "<a id='" + currentTag.alias + "' href='" +
                        link + "'>" + link + ' ' + currentTag.name + "</a>";
                    }
                }
                t += "</td>";
            });
            t += "</tr>";
        }
        t += "</table>";
        return t;
    },

    render: function() {
        var t = "<a href='/~/' id ='overview_tag'>/~/ " + l.overview + "</a>"
        var taglist = this;
        var token = {};
        if (settings.get('defence_token') != undefined) {
            token = {defence_token: settings.get('defence_token')};
        }
        $.ajax({
            type: 'post',
            url: '/utility/get_tags',
            data: token,
            async: true,
            success: function(response) {
                taglist.counters = response.counters
                if (response.captcha != undefined) {
                    taglist.captcha = response.captcha;
                }
                if (response.defence_token != undefined) {
                    settings.set('defence_token', response.defence_token);
                } 
                if (response.admin != undefined) {
                    admin = true;
                }
                taglist.tagsArray = JSON.parse(response.tags);
                t += taglist.renderTagTable(3, false);
                taglist.$el.append(t);
                taglist.callback();
            },
        });
        return this;
    },

    adjust: function() {
        var offset = $("#tags_link").offset().left
        this.$el.css('left', offset - this.$el.width()/2);
        this.$el.css('top', -(this.$el.height() + 50));
        return this;
    },
});


