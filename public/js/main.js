!function() {
  var editor = ace.edit('editor'),
      button = $('#run-btn'),
      out = $('#console');

  // Focus editor by-default
  $('#editor').focus();

  var runtime,
      runtimeCallbacks = [];
  function getRuntime(callback) {
    if (runtime) return callback(runtime);

    if (runtimeCallbacks.length === 0) {
      $.ajax({
        type: 'GET',
        url: 'api/runtime'
      }).done(function(data) {
        runtime = data.output;
        runtimeCallbacks.forEach(function(callback) {
          callback(runtime);
        });
      }).fail(function() {
        // TODO: Handle errors
      });
    }
    runtimeCallbacks.push(callback);
  }

  button.button().on('click', function(e) {
    e.preventDefault();
    button.button('loading');

    getRuntime(function(runtime) {
      $.ajax({
        type: 'POST',
        url: 'api/raw',
        data: JSON.stringify({ source: editor.getSession().getValue() }),
        contentType: 'application/json'
      }).done(function(data) {
        run(runtime, data.output);
      }).fail(function() {
        // TODO: Handle errors
      }).always(function() {
        button.button('reset');
        button.focus();
      });
    });
  });

  function run(runtime, code) {
    var global = {
      print: function(value) {
        var result = global.stringify(value);
        out.append($('<div/>').text(result));
      },
      runtime: null,
      stringify: function(value) {
        switch (global.runtime.$typeof(value)) {
          case 'nil': return 'nil';
          case 'object': return '[object]';
          case 'array': return '[array]';
          default: return global.runtime.$toString(value);
        }
      }
    };

    var res = eval(
      '(function() {\n' + runtime + '\nglobal.runtime = $$runtime\n' +
      code +
      '\n}).call(global)'
    );

    if (res !== undefined) global.print(res);
  }
}();
