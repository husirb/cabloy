function load(name) {
  return require(`./pages/${name}.vue`).default;
}
function loadjsx(name) {
  return require(`./pages/${name}.jsx`).default;
}

export default [
  { path: 'role/list', component: load('role/list') },
  { path: 'role/edit', component: load('role/edit') },
  { path: 'role/select', component: load('role/select') },
  { path: 'user/list', component: load('user/list') },
  { path: 'user/view', component: load('user/view') },
  { path: 'user/search', component: load('user/search') },
  { path: 'user/select', component: load('user/select') },
  { path: 'user/rights', component: load('user/rights') },
  { path: 'atomRight/list', component: load('atomRight/list') },
  { path: 'atomRight/edit', component: load('atomRight/edit') },
  { path: 'atomRight/add', component: load('atomRight/add') },
  { path: 'auth/list', component: load('auth/list') },
  { path: 'auth/info', component: load('auth/info') },
  { path: 'settings/list', component: load('settings/list') },
  { path: 'category/management', component: loadjsx('category/management') },
  { path: 'category/tree', component: load('category/tree') },
  { path: 'category/edit', component: load('category/edit') },
  { path: 'tag/management', component: loadjsx('tag/management') },
  { path: 'tag/list', component: load('tag/list') },
];
