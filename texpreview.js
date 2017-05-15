$(function() {
    var page_list = JSON.parse(localStorage.texpreview_pagelist) || ['default'];
    var page_name = localStorage.texpreview_currentpage || page_list[0];
    $('#page_name').val(page_name);
    var autocomplete_options;

    var editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    var content = JSON.parse(localStorage.texpreview_content);
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
            page_list = JSON.parse(localStorage.texpreview_pagelist)
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
                    page_list.splice(page_list.indexOf(p), 1);
                    content[p] = undefined;
                    localStorage.texpreview_pagelist = JSON.stringify(page_list);
                    localStorage.texpreview_content = JSON.stringify(content);
                    localStorage.texpreview_currentpage = page_list[0];

                    location.reload();
                    // autocomplete_options.data = page_list;
                    // $('#page_name').easyAutocomplete(autocomplete_options);
                    // bindAutocomplete();
                }
            }
        });
    }

    function updatePageName() {
        var new_page_name = $('#page_name').val();
        if (new_page_name) {
            page_name = new_page_name;
            localStorage.texpreview_currentpage = new_page_name;
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
        content = JSON.parse(localStorage.texpreview_content);
        if (content[page_name] == undefined) {
            editor.setValue('\\begin{aligned}\n    a^2 + b^2 &= c^2\\\\\n\\end{aligned}', -1);
        } else if (content[page_name] !== editor.getValue()) {
            var pos = editor.session.selection.toJSON();
            editor.session.setValue(content[page_name]);
            editor.session.selection.fromJSON(pos);
        }
    }, 1000);

});
