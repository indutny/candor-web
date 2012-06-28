var flatiron = require('flatiron'),
    ecstatic = require('ecstatic'),
    candor = require('./candor.js'),
    app = flatiron.app;

app.use(flatiron.plugins.http);
app.http.before = [
  ecstatic(__dirname + '/public')
];

app.router.post('/api/raw', function() {
  if (!this.req.body || !this.req.body.source) {
    this.res.json(400, {
      error: true,
      message: 'body.source expected'
    });
  }

  try {
    this.res.json({
      output: candor.translate(this.req.body.source, {
        raw: true,
        tweakGlobals: false
      })
    });
  } catch (e) {
    if (e.type === 'ParserError') {
      this.res.json(400, {
        error: true,
        type: 'ParserError',
        text: e.text,
        line: e.line,
        offset: e.offset
      });
    } else {
      this.res.json(500, {
        error: true,
        type: 'Exception',
        message: e.message,
        stack: e.stack
      });
    }
  }
});

var runtime = candor.compiler.getRuntime();
app.router.get('/api/runtime', function() {
  this.res.json({
    output: runtime
  });
});

app.start(8080, function() {
  console.log(
    'server started at %s:%d',
    this.address().address,
    this.address().port
  );
});
