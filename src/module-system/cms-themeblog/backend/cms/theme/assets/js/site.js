$(document).ready(function() {

  // query
  const query = util.parseUrlQuery();

  // title
  title(query);

  // menu active
  menuActive(query);

  // search text
  if (query.search) {
    $('form.search input').val(query.search);
  }

  // load more
  loadMore(query);

  // breadcrumb
  breadcrumb();

  // relatives
  relatives();

});

function menuActive(query) {
  const categoryId = query.categoryId || (env.article && env.article.categoryId);
  if (categoryId) {
    const link = $(`.category-${categoryId}`);
    link.parents('li').addClass('active');
  }
}

function title(query) {
  if (env.site.path === 'static/category') {
    if (query.search) {
      document.title = `<%=text('Search')%>:${query.search}-${env.base.title}`;
    } else {
      document.title = `${categoryName(query.categoryId)}-${env.base.title}`;
    }
  }
}

function breadcrumb() {
  if (env.site.path === 'main/article') {
    const $category = $(`.category-${env.article.categoryId}`);
    $('.breadcrumb .category')
      .attr('href', $category.attr('href'))
      .text($category.data('category-name'));
    $('.breadcrumb .active').text(env.article.atomName);
  }
}

function relatives() {
  if (env.site.path === 'main/article') {
    _relatives('prev');
    _relatives('next');
  }
}

function _relatives(type) {
  // article
  const article = env.article;
  // options
  const options = {
    where: {
      'f.language': article.language,
      'f.categoryId': article.categoryId,
    },
    page: { index: 0, size: 1 },
    mode: 'list',
  };
  if (article.sorting > 0) {
    // asc for sorting
    options.where['f.sorting'] = { op: type === 'prev' ? '<' : '>', val: article.sorting };
    options.orders = [
      [ 'f.sorting', type === 'prev' ? 'desc' : 'asc' ],
    ];
  } else {
    // desc for createdAt
    options.where['f.createdAt'] = { op: type === 'prev' ? '>' : '<', val: this.ctx.meta.util.formatDateTime(article.createdAt) };
    options.orders = [
      [ 'f.createdAt', type === 'prev' ? 'asc' : 'desc' ],
    ];
  }
  // select
  util.ajax({
    url: '/a/cms/article/list',
    body: { options: JSON.stringify(options) },
  }).then(data => {
    _relative({ type, article: data.list[0] });
  });
}

function _relative({ type, article }) {
  if (!article) return;
  const $relative = $(`.relatives .${type}`);
  const $relativeLink = $(`.relatives .${type} a`);

  $relativeLink.attr('href', `${env.site.rootUrl}/${article.url}`);
  $relativeLink.text(article.atomName);
  $relative.removeClass('hidden');
}

function categoryName(categoryId) {
  return $(`.category-${categoryId}`).data('category-name');
}

function loadMore(query) {
  if (env.site.path === 'main/index/index') {
    _loadMore({});
  } else if (env.site.path === 'static/category') {
    _loadMore({
      categoryId: query.categoryId,
      search: query.search });
  }
}

function _loadMore({ categoryId, search }) {
  util.loadMore({
    container: '.article-list',
    index: (env.index && env.index[env.site.path]) || 0,
    onFetch({ index }) {
      // options
      const options = {
        where: {
          'f.language': env.language.current,
        },
        orders: [
          [ 'f.sticky', 'desc' ],
          [ 'a.createdAt', 'desc' ],
        ],
        page: { index },
        mode: 'list',
      };
      // categoryId
      if (categoryId) {
        options.where['f.categoryId'] = categoryId;
        options.orders = [
          [ 'f.sticky', 'desc' ],
          [ 'f.sorting', 'asc' ],
          [ 'a.createdAt', 'desc' ],
        ];
      }
      // search
      if (search) {
        options.where['f.content'] = { val: search, op: 'like' };
        options.mode = 'search';
      }
      // select
      return util.ajax({
        url: '/a/cms/article/list',
        body: { options: JSON.stringify(options) },
      });
    },
    onParse(item) {
      const sticky = !item.sticky ? '' : '<span class="glyphicon glyphicon-pushpin"></span>';
      const media = !item.imageFirst ? '' : `
<div class="media-right">
      <a target="_blank" href="${env.site.rootUrl}/${item.url}">
        <img class="media-object" src="${util.combineImageUrl(item.imageFirst, 125, 100)}">
      </a>
</div>
        `;
      return `
<li class="media">
    <div class="media-body">
      <h4 class="media-heading">${sticky} <a target="_blank" href="${env.site.rootUrl}/${item.url}">${item.atomName}</a></h4>
      ${item.description || item.summary}
    </div>
    ${media}
</li>
        `;
    },
  });
}
