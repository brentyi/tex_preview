$(() => {
  /*
   * JSON parsing helper
   */
  let parseJSON = (value, default_output) =>
    value ? JSON.parse(value) : default_output;

  /*
   * Global state module
   */
  let State = (() => {
    const DEFAULT_CONTENT =
      "\\begin{aligned}\n    a^2 + b^2 &= c^2\\\\\n\\end{aligned}";

    // State variable: map from page names to page content
    let content_map = parseJSON(localStorage.texpreview_content, {});
    if (Object.keys(content_map).length == 0) {
      content_map = { default: DEFAULT_CONTENT };
    }

    // State variable: name of current page
    let current_page_name = localStorage.texpreview_currentpage;
    if (Object.keys(content_map).indexOf(current_page_name) === -1)
      current_page_name = Object.keys(content_map)[0];

    // Set page title
    document.title = "tex: " + current_page_name;

    // What happens when a new page is created?
    let new_page_callback = undefined;

    // Expose interface
    return {
      onNewPage: (callback) => {
        new_page_callback = callback;
      },
      getPageList: () => Object.keys(content_map),
      getCurrentPageName: () => current_page_name,
      setCurrentPageName: (new_page_name) => {
        current_page_name = new_page_name;
        localStorage.texpreview_currentpage = new_page_name;

        // Update page title
        document.title = "tex: " + current_page_name;
      },
      getCurrentPageContent: () => content_map[current_page_name],
      getPageContent: (page_name) => content_map[page_name],
      setPageContent: (page_name, content) => {
        // Does the page exist yet?
        let new_page = false;
        if (content_map[page_name] == undefined) {
          new_page = true;
        }

        // Update content
        content_map[page_name] = content;
        localStorage.texpreview_content = JSON.stringify(content_map);

        // Call new page callback if needed
        new_page && new_page_callback && new_page_callback();
      },
      reloadContent: () => {
        content_map = parseJSON(localStorage.texpreview_content, {});
      },
      setCurrentPageContent: function (content) {
        this.setPageContent(current_page_name, content);
      },
      deletePage: (page_name) => {
        // Re-assign page name
        if (current_page_name === page_name) {
          current_page_name = Object.keys(content_map)[0] || "default";
          localStorage.texpreview_currentpage = current_page_name;
        }

        // Delete content
        delete content_map[page_name];
        localStorage.texpreview_content = JSON.stringify(content_map);
      },
    };
  })();

  /*
   * Abstraction for text editor
   */
  let Editor = (() => {
    // Configure Ace
    let editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.getSession().setMode("ace/mode/latex");
    editor.setOptions({
      showInvisibles: true,
      highlightSelectedWord: true,
      showPrintMargin: false,
    });
    editor.setBehavioursEnabled(false);
    editor.renderer.setScrollMargin(15, 15);

    // Vim mode toggle handler
    $("#vim_mode").on("change", function () {
      localStorage.vimMode = this.checked;
      if (this.checked) {
        console.log("vim mode");
        editor.setKeyboardHandler("ace/keyboard/vim");
      } else {
        console.log("sublime mode");
        editor.setKeyboardHandler("ace/keyboard/sublime");
      }
    });

    // Read Vim mode from localStorage, default to false
    $("#vim_mode")
      .prop("checked", parseJSON(localStorage.vimMode, false))
      .trigger("change");

    // Expose interface
    return {
      getContent: () => editor.getValue(),
      setContent: (content) => {
        let pos = editor.session.selection.toJSON();
        editor.session.setValue(content);
        editor.session.selection.fromJSON(pos);
      },
      onChange: (callback) => editor.on("change", callback),
      focus: () => editor.focus(),
    };
  })();

  /*
   * Abstraction for page selection interface
   */
  let PageSelector = (() => {
    // Helper for updating the current page name
    let update_page_name_callback = undefined;
    let updatePageName = () => {
      let new_page_name = $("#page_name").val();
      if (new_page_name) {
        update_page_name_callback && update_page_name_callback(new_page_name);
        return true;
      }
      return false;
    };

    // Configure our autocomplete plugin
    let autocomplete_options = {
      template: {
        type: "custom",
        method: (value, item) => {
          return (
            value +
            '<button class="delete_page" data-page="' +
            item +
            '">&#x2716;</button>'
          );
        },
      },
      list: {
        onChooseEvent: updatePageName,
        showAnimation: {
          type: "slide",
          time: 400,
          callback: () => {},
        },
        hideAnimation: {
          type: "fade",
          time: 400,
          callback: () => {},
        },
      },
      highlightPhrase: false,
    };

    // What happens when we delete a page?
    let delete_callback = undefined;

    // Expose interface
    return {
      setup: (page_name, page_list) => {
        // Set current page name
        $("#page_name").val(page_name);

        // Initialize easyAutocomplete with the given page list
        autocomplete_options.data = page_list;
        $("#page_name").easyAutocomplete(autocomplete_options);

        // Detach default easyAutocomplete bindings, and add some of our own
        $("#page_name").off("keydown");
        $("#page_name")
          .keydown((e) => {
            // Set page name when we hit enter
            if (e.which === 13) {
              updatePageName();
            }
          })
          .focus(() => {
            // Make the autocomplete list appear when we focus
            $("#page_name").attr("value", "");
            $("#page_name").triggerHandler(
              jQuery.Event("keyup", { keyCode: 65, which: 65 })
            );
            $("#page_name").trigger("change");
          })
          .blur(() => {
            // Set page name when we click away
            updatePageName();
          });

        // Event handler for "delete page" button
        $(".easy-autocomplete").off("click");
        $(".easy-autocomplete *").click((evt) => {
          // This wildcard + condition combo feels hacky but is important for event propagation order
          if ($(evt.target).is(".delete_page")) {
            evt.stopPropagation();
            let p = $(evt.target).data("page");
            if (confirm("You're about to delete " + p + " forever.")) {
              delete_callback && delete_callback(p);
            }
          }
        });
      },
      onSelect: (callback) => {
        update_page_name_callback = callback;
      },
      onDelete: (callback) => {
        delete_callback = callback;
      },
    };
  })();

  // Link modules together

  PageSelector.setup(State.getCurrentPageName(), State.getPageList());

  State.onNewPage(() => {
    // Reset the page selector when a new page appears
    PageSelector.setup(State.getCurrentPageName(), State.getPageList());

    // Assign content to whatever's in the editor
    State.setCurrentPageContent(Editor.getContent());
  });
  PageSelector.onDelete((to_delete) => {
    // Delete a page
    State.deletePage(to_delete);
    location.reload();
  });
  PageSelector.onSelect((new_page_name) => {
    // Select a different page
    Editor.focus();
    State.setCurrentPageName(new_page_name);
    if (State.getCurrentPageContent() !== undefined)
      Editor.setContent(State.getCurrentPageContent());
  });

  Editor.onChange((data) => {
    // Update state and re-render when editor sees a content change
    State.setCurrentPageContent(Editor.getContent());
    try {
      let html = katex.renderToString(State.getCurrentPageContent(), {
        displayMode: true,
      });
      $("#error").text("");
      $("#output").html(html);
    } catch (e) {
      // Display error
      e = String(e);
      if (e.startsWith("ParseError: KaTeX parse error: ")) {
        e = e.substring(31);
      }
      $("#error").text(e);
    }
  });

  // Pull in initial content
  Editor.setContent(State.getCurrentPageContent());

  // Poll for updated content (eg from other tabs/windows)
  setInterval(() => {
    State.reloadContent();
    if (
      State.getCurrentPageContent() !== undefined &&
      State.getCurrentPageContent() !== Editor.getContent()
    ) {
      Editor.setContent(State.getCurrentPageContent());
    }
  }, 1000);
});
