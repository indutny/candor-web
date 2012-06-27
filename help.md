# Candor

Candor is a language inspired by javascript, but with less features and,
therefore, less complexity. So no semicolons, no exceptions and simplified
anonymous function syntax (dart-like).

Main goal of Candor is to provide a powerful and developer-friendly language
that can be easily optimized by compiler.

## Language basics

Candor is essentially inspired by the [ECMA-script](http://www.ecmascript.org/),
but has much less features and complexity (for compiler).

Functions are declared in [dart](http://www.dartlang.org/)-like style, variables
are implicitly scoped (i.e. if variable has no use in outer scopes, it'll be
allocated in one where you declared it).
