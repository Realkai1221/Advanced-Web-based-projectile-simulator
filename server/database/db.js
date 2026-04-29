var initSqlJs = require('sql.js');
var path = require('path');
var fs = require('fs');

var dataDir = path.join(__dirname, '..', '..', 'data');
var dbPath = path.join(dataDir, 'projectile-sim.db');

var _db = null;

// this wrapper makes it work like better-sqlite3 so the rest of the code can use the same API 
var database = {

  async init() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    var SQL = await initSqlJs();

    if (fs.existsSync(dbPath)) {
      var buf = fs.readFileSync(dbPath);
      _db = new SQL.Database(buf);
    } else {
      _db = new SQL.Database();
    }

    _db.run('PRAGMA foreign_keys = ON');
    _db.run('PRAGMA journal_mode = WAL');

    var schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    _db.exec(schema);
    this._save();
  },

  prepare(sql) {
    return {
      run: function() {
        var params = Array.prototype.slice.call(arguments);
        _db.run(sql, params);
        database._save();
        return { changes: _db.getRowsModified() };
      },
      get: function() {
        var params = Array.prototype.slice.call(arguments);
        var stmt = _db.prepare(sql);
        if (params.length) stmt.bind(params);
        var result = undefined;
        if (stmt.step()) result = stmt.getAsObject();
        stmt.free();
        return result;
      },
      all: function() {
        var params = Array.prototype.slice.call(arguments);
        var stmt = _db.prepare(sql);
        if (params.length) stmt.bind(params);
        var results = [];
        while (stmt.step()) results.push(stmt.getAsObject());
        stmt.free();
        return results;
      }
    };
  },

  exec(sql) {
    _db.exec(sql);
    database._save();
  },

  _save() {
    var data = _db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  }
};

module.exports = database;
