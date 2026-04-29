// after looking online i choose sessionStorage over localStorage because I didnt want tokens staying around after the user closes the tab

let _token = null;
let _uid = null;
let _role = null;

(function() {
  var saved = sessionStorage.getItem('session');
  if (saved) {
    try {
      var s = JSON.parse(saved);
      _token = s.token;
      _uid = s.userId;
      _role = s.role;
    } catch (e) {
      sessionStorage.removeItem('session');
    }
  }
})();


var api = {
  setSession: function(token, userId, role) {
    _token = token;
    _uid = userId;
    _role = role;
    sessionStorage.setItem('session', JSON.stringify({ token, userId, role }));
  },

  clearSession: function() {
    _token = null;
    _uid = null;
    _role = null;
    sessionStorage.removeItem('session');
  },

  getToken: function() { return _token; },
  getUserId: function() { return _uid; },
  getRole: function() { return _role; },
  isLoggedIn: function() { return _token !== null; },

  request: async function(method, url, body) {
    var opts = {
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (_token) {
      opts.headers['Authorization'] = 'Bearer ' + _token;
    }

    if (body) {
      opts.body = JSON.stringify(body);
    }

    var resp = await fetch(url, opts);
    var data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.error || 'Request failed with status ' + resp.status);
    }

    return data;
  },

  get: async function(url) { return api.request('GET', url); },
  post: async function(url, body) { return api.request('POST', url, body); },
  put: async function(url, body) { return api.request('PUT', url, body); },
  del: async function(url) { return api.request('DELETE', url); }
};
