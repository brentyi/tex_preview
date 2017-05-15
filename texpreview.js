$(function() {
    var page_list = Cookies.getJSON('texpreview_pagelist') || ['default'];
    var page_name = Cookies.get('texpreview_currentpage') || page_list[0];
    $('#page_name').val(page_name);
    var autocomplete_options;

    var editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    var content = Cookies.get('texpreview_content_' + page_name);
    if (content == undefined) {
        editor.setValue('\\begin{aligned}\n    a^2 + b^2 &= c^2\\\\\n\\end{aligned}', -1);
    } else {
        editor.setValue(content, -1);
    }

    editor.getSession().setMode("ace/mode/latex");
    editor.setKeyboardHandler("ace/keyboard/vim");
    editor.setOptions({
        "showInvisibles": true,
        "highlightSelectedWord": true,
        "showPrintMargin": false
    });
    editor.setBehavioursEnabled(false);
    editor.renderer.setScrollMargin(15, 15);
    console.log(editor.getValue());

    var render = function() {
        try {
            var content = editor.getValue();
            var html = katex.renderToString(content, {
                displayMode: true,
                throwOnError: false
            });
            $('#error').text('');
            $('#output').html(html);
        } catch(e) {
            e = String(e);
            if (e.startsWith("ParseError: KaTeX parse error: ")) {
                e = e.substring(31);
            }
            $('#error').text(e);
        }
    }
    render();

    editor.on('change', function(data) {
        Cookies.set('texpreview_content_' + page_name, editor.getValue(), {expires: 365});
        render();

        if (page_list.indexOf(page_name) == -1) {
            page_list = Cookies.getJSON('texpreview_pagelist') || ['default'];
            if (page_list.indexOf(page_name) == -1) {
                page_list.push(page_name);
                Cookies.set('texpreview_pagelist', page_list, {expires: 365});
                autocomplete_options.data = page_list;
                $('#page_name').easyAutocomplete(autocomplete_options);
                bindAutocomplete();
            }
        }
    });


    autocomplete_options = {
            data: page_list,
            template: {
                type: "custom",
                method: function(value, item) {
                    return value + '<button class="delete_page" data-page="' + item + '">&#x2716;</button>';
                }
            },
            list: {
                onChooseEvent: function() {
                    updatePageName();
                }
            }
    };
    $('#page_name').easyAutocomplete(autocomplete_options);
    bindAutocomplete();

    function bindAutocomplete() {
        $('.easy-autocomplete *').click(function(evt) {
            if ($(evt.target).is('.delete_page')) {
                // this is a bit of a hack
                evt.stopPropagation();
                var p = $(evt.target).data('page');
                if (confirm("You're about to delete " + p + " forever.")) {
                    page_list = Cookies.getJSON('texpreview_pagelist') || ['default'];
                    page_list.splice(page_list.indexOf(p), 1);
                    Cookies.set('texpreview_pagelist', page_list), {expires: 365};
                    autocomplete_options.data = page_list;
                    $('#page_name').easyAutocomplete(autocomplete_options);
                    bindAutocomplete();
                    Cookies.remove('texpreview_content_' + p);

                    location.reload();
                }
            }
        });
    }

    function updatePageName() {
        var new_page_name = $('#page_name').val();
        if (new_page_name) {
            page_name = new_page_name;
            Cookies.set('texpreview_currentpage', new_page_name);
            editor.focus();
            return true;
        }
        return false;
    }

    $('#page_name').keypress(function (e){
        if (e.which == 13) {
            updatePageName();
        }
    });

    $('#page_name').blur(function() {
        $('#page_name').val(page_name);
    });

    setInterval(function() {
        var content = Cookies.get('texpreview_content_' + page_name);
        if (content == undefined) {
            editor.setValue('\\begin{aligned}\n    a^2 + b^2 &= c^2\\\\\n\\end{aligned}', -1);
        } else if (content !== editor.getValue()) {
            var pos = editor.session.selection.toJSON();
            editor.session.setValue(content);
            editor.session.selection.fromJSON(pos);
        }
    }, 250);

});
