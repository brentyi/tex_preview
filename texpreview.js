$(function() {
    var page_list = parseJSON(localStorage.texpreview_pagelist, ['default']);
    var page_name = localStorage.texpreview_currentpage || page_list[0];
    $('#page_name').val(page_name);
    var autocomplete_options;

    var editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    var content = parseJSON(localStorage.texpreview_content, {});
    if (content[page_name] == undefined) {
        editor.setValue('\\begin{aligned}\n    a^2 + b^2 &= c^2\\\\\n\\end{aligned}', -1);
    } else {
        editor.setValue(content[page_name], -1);
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
            content[page_name] = editor.getValue();
            var html = katex.renderToString(content[page_name], {
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
        content[page_name] = editor.getValue();
        localStorage.texpreview_content = JSON.stringify(content);
        render();

        if (page_list.indexOf(page_name) == -1) {
            page_list = parseJSON(localStorage.texpreview_pagelist, ['default'])
            if (page_list.indexOf(page_name) == -1) {
                page_list.push(page_name);
                localStorage.texpreview_pagelist = JSON.stringify(page_list);
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
                onChooseEvent: updatePageName,
                showAnimation: {
                    type: "slide",
                    time: 400,
                    callback: function() {}
                },
                hideAnimation: {
                    type: "fade",
                    time: 400,
                    callback: function() {}
                }
            },
    };
    $('#page_name').easyAutocomplete(autocomplete_options);

    // Unbind easyAutocomplete's "Enter" keydown event handler (we have our own above)
    $('#page_name').unbind('keydown');
    bindAutocomplete();

    function bindAutocomplete() {
        $('.easy-autocomplete *').click(function(evt) {
            if ($(evt.target).is('.delete_page')) {
                // this is a bit of a hack
                evt.stopPropagation();
                var p = $(evt.target).data('page');
                if (confirm("You're about to delete " + p + " forever.")) {
                    page_list.splice(page_list.indexOf(p), 1);
                    content[p] = undefined;
                    localStorage.texpreview_pagelist = JSON.stringify(page_list);
                    localStorage.texpreview_content = JSON.stringify(content);
                    localStorage.texpreview_currentpage = page_list[0];

                    location.reload();
                }
            }
        });
    }

    function updatePageName() {
        var new_page_name = $('#page_name').val();
        if (new_page_name) {
            page_name = new_page_name;
            localStorage.texpreview_currentpage = new_page_name;
            return true;
        }
        return false;
    }

    $('#page_name')
        .keypress(function (e){
            if (e.which == 13) {
                editor.focus();
            }
        })
        .focus(function () {
            // Make the autocomplete list appear
            $("#page_name").attr('value', '');
            $("#page_name").triggerHandler(jQuery.Event("keyup", { keyCode: 65, which: 65}));
            $("#page_name").trigger('change');
        })
        .blur(updatePageName);

    setInterval(function() {
        content = parseJSON(localStorage.texpreview_content, {});
        if (content[page_name] == undefined) {
            content[page_name] = '\\begin{aligned}\n    a^2 + b^2 &= c^2\\\\\n\\end{aligned}';
            localStorage.texpreview_content = JSON.stringify(content);
            //editor.setValue(content[page_name], -1);
        } else if (content[page_name] !== editor.getValue()) {
            var pos = editor.session.selection.toJSON();
            editor.session.setValue(content[page_name]);
            editor.session.selection.fromJSON(pos);
        }
    }, 1000);

    function parseJSON(value, def="") {
        if (value)
            return JSON.parse(value);
        return def;
    }
});
