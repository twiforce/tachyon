var PaginatorView = Backbone.View.extend({
    tagName:  'div',
    id:       'paginator',
    el:       '',

    events: {
        "change #order": 'setOrder',
    },

    render: function(totalPages, currentPage, tag) {
        this.currentPage = currentPage;
        this.tag = tag;
        var t = '<span>' + l.pages + ':</span>';
        var hrefCurrent = "'.'";
        if (currentPage > 1) {
            var iterator = 1;
            var dotsAdded = false;
            for (var page = 1; page < currentPage; page++) {
                t += this.pageLink(page);
                iterator++;
                if (iterator > 1 && currentPage-2 > 3 && dotsAdded == false) {
                    t += "...";
                    dotsAdded = true;
                    page = currentPage - 4;
                }
            }
        }
        t += this.pageLink(currentPage);
        if (currentPage < totalPages) {
            var iterator = 1;
            var dotsAdded = false;
            for (var page = currentPage+1; page < totalPages+1; page++) {
                if (iterator > 3) {
                    if (dotsAdded == false) {
                        if ((totalPages - (currentPage+3)) > 1) {
                            t += "...";
                        }
                        t += this.pageLink(totalPages);
                        dotsAdded = true;
                    }
                } else {
                    t += this.pageLink(page);
                }
                iterator++;
            }
        }
        t += "<label>";
            t += l.order.by + ": <select id='order' name='order'>";
            ['bump', 'created_at'].forEach(function(option) {
                t += "<option value='" + option + "'";
                if (settings.get('order') == option) {
                    t += " selected='selected'";
                }
                t += ">" + l.order[option] + "</option>";
            });
            t += "</select>";
        t += "</label>";
        this.el.innerHTML = t;
        return this;
    },

    setOrder: function(event) {
        settings.set('order', $(event.currentTarget).val());
        return this;
    },

    pageLink: function(pageNumber) {
        var t = "<a href='/" + this.tag + "/";
        if (pageNumber != 1) {
            t += "page/" + pageNumber;
        } 
        t += "' "
        if (this.currentPage == pageNumber) {
            t += "class='current'";
        }
        t += ">" + pageNumber + "</a>";
        return t;
    },
});