!function() {
  // Default source
  var demoCode = 'print = global.print\n' +
                 'while (i < 10) {\n' +
                 '  print(i)\n' +
                 '  i++\n' +
                 '}\n' +
                 'print(\'I\\\'m done!\')',
      editor = ace.edit('editor'),
      button = $('#run-btn'),
      out = $('#console'),
      errorAlert = $('.error-alert');

  editor.env.document.setValue(demoCode);
  editor.env.document.setMode('ace/mode/candor');
  editor.env.document.setTabSize(2);

  // Focus editor by-default
  editor.focus();

  // Init error message
  errorAlert.alert();

  function showAlert(text) {
    if (showAlert.last) {
      showAlert.last.remove();
      showAlert.last = null;
    }

    if (text) {
      var err = errorAlert.clone().insertAfter(errorAlert);
      err.find('.text').text(text);
      err.fadeIn();
      showAlert.last = err;
    }
  }

  // Candor's runtime loader
  function getRuntime(callback) {
    if (getRuntime.source) return callback(getRuntime.source);

    if (getRuntime.callbacks.length === 0) {
      $.ajax({
        type: 'GET',
        url: 'api/runtime'
      }).done(function(data) {
        getRuntime.source = data.output;
        getRuntime.callbacks.forEach(function(callback) {
          callback(getRuntime.source);
        });
      }).fail(function() {
        // TODO: Handle errors
      });
    }
    getRuntime.callbacks.push(callback);
  }
  getRuntime.source;
  getRuntime.callbacks = [];

  // Compile and evaluate Candor's code on button click
  button.button().on('click', function(e) {
    e.preventDefault();
    button.button('loading');
    editor.setReadOnly(true);

    // Remove any error messages
    showAlert();

    getRuntime(function(runtime) {
      $.ajax({
        type: 'POST',
        url: 'api/raw',
        data: JSON.stringify({ source: editor.getSession().getValue() }),
        contentType: 'application/json'
      }).done(function(data) {
        out.empty();
        // Run in next tick to prevent exceptions blocking `always` call
        setTimeout(function() {
          run(runtime, data.output);
        }, 0);
      }).fail(function(xhr) {
        // TODO: Handle errors
        try {
          var err = JSON.parse(xhr.responseText);
        } catch (e) {
          return;
        }

        if (err.type === 'Exception') {
          showAlert(err.message);
        } else if (err.type === 'ParserError') {
          // Highlight line in the source and show error message
          editor.moveCursorTo(err.line - 1, err.offset - 1);

          showAlert(err.text);
        }
      }).always(function() {
        button.button('reset');
        editor.setReadOnly(false);
        editor.focus();
      });
    });
  });

  function run(runtime, code) {
    // Flatten printable buffer
    function flatten(buffer) {
      return buffer.map(function(item) {
        if (Array.isArray(item)) return flatten(item);
        return item.value;
      }).join('');
    }

    // Render's buffer to html
    function render(buffer, out) {
      buffer.forEach(function(item) {
        if (Array.isArray(item)) return render(item, out);

        out.append(
          $('<span class="console-' + item.type + '"/>').text(item.value)
        );
      })

      return out;
    }

    var global = {
      print: function() {
        var results = [];
        for (var i = 0; i < arguments.length; i++) {
          results.push(global.stringify(arguments[i], 0, true));
          if (i !== arguments.length - 1) {
            results.push({ type: 'text', value: ' ' });
          }
        }

        out.append(render(results, $('<div class="console-line"/>')));
        out.scrollTop(1e6);
      },
      runtime: null,

      // Stringify value
      stringify: function stringify(value, depth, color) {
        if (!depth) depth = 0;

        if (!color) return flatten(stringify(value, depth, true))

        var type = global.runtime.$typeof(value);
        if (type === 'nil') {
          return [{ type: 'keyword', value: 'nil' }];
        } else if (depth >= 3 && (type === 'object' || type === 'array') ||
                   type === 'function') {
          return [{ type: 'keyword', value: '[' + type + ']' }];
        } else if (type === 'object') {
          return [{
            type: 'punc', value: '{'
          }, {
            type: 'text', value: ' '
          }].concat(global.runtime.$keysof(value).map(function(key, i, list) {
            var result = [
              stringify(key, depth + 1, true),
              { type: 'punc', value: ':' },
              { type: 'text', value: ' ' },
              stringify(value[key], depth + 1, true)
            ];
            if (i !== list.length - 1) {
              result = [result, { type: 'punc', value: ', ' }];
            }
            return result;
          })).concat([{
            type: 'text', value: ' '
          }, {
            type: 'punc', value: '}'
          }]);
        } else if (type === 'array') {
          return [{
            type: 'punc', value: '['
          }, {
            type: 'text', value: ' '
          }].concat(value.map(function(key, i, list) {
            var result = stringify(key, depth + 1, true);
            if (i !== list.length - 1) {
              result = [result, { type: 'punc', value: ', ' }];
            }
            return result;
          })).concat([{
            type: 'text', value: ' '
          }, {
            type: 'punc', value: ']'
          }]);
        } else if (type === 'number') {
          return [{ type: 'number', value: global.runtime.$toString(value) }];
        } else {
          return [{
            type: 'string',
            value: JSON.stringify(global.runtime.$toString(value))
          }];
        }
      }
    };

    var res = eval(
      '(function() {\n' +
      runtime + '\n' +
      // Expose runtime to global utilities
      'global.runtime = $$runtime\n' +
      code +
      '\n}).call(global)'
    );

    if (res !== undefined) global.print(res);
  }
}();
