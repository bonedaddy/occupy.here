window.addEvent('domready', function() {
  var $ = document.id;
  if ($$('input[name=author]').length > 0) {
    var input = $$('input[name=author]')[0];
    input.addEvent('blur', function() {
      Cookie.write('author', input.value, {
        duration: 365 * 10
      });
    });
  }
  if ($$('form').length > 0) {
    $$('form')[0].addEvent('submit', function(e) {
      if ($$('input[name=author]')[0].value == '') {
        $$('input[name=author]')[0].value = 'Anonymous';
      }
      if ($$('textarea')[0].value == '') {
        new Event(e).stop();
      } else {
        localStorage.updated = '';
      }
    });
  }
  if ($('first_comment')) {
    $('first_comment').setStyle('visibility', 'visible');
    $('first_comment').setStyle('position', 'static');
    var slide = new Fx.Slide($('first_comment')).hide();
    $('add_first_comment').addEvent('click', function(e) {
      new Event(e).stop();
      slide.toggle();
      if (!slide.open) {
        $('add_first_comment').set('html', 'hide first comment');
      } else {
        $('add_first_comment').set('html', 'show first comment');
      }
    });
    if ($$('textarea[name=first_comment]')[0].value != '') {
      slide.show();
      $('add_first_comment').set('html', 'hide first comment');
    }
  }
  if ($('id') && $('time') && $('date')) {
    var now = new Date();
    $('id').value = now.getTime();
    $('time').value = now.format('%I:%M %p');
    $('date').value = now.format('%b %e, %Y');
  }
  var data = new LocalData();
  if (data.itsPeanutButterJellyTime()) {
    data.check();
  }
  data.setupAuthorFilter();
  data.setupMentionFilter();
  data.setupLocationFilter();
  data.setupLinks();
  
  if ($('slides')) {
    var slides = new Slides($('slides'));
  }
  
  if ($(document.body).hasClass('index') ||
      $(document.body).hasClass('archive')) {
    $$('article').each(function(article) {
      article.addEvent('touchstart', function(e) {
        $(document.body).addClass('touch-ui');
        article.addClass('touched');
      });
      document.addEvent('touchend', function(ev) {
        var e = new Event(ev);
        if (e.target.get('href')) {
          return;
        }
        if ($$('article.touched').length > 0) {
          var touched = $$('article.touched')[0];
          var link = touched.getElement('.comments a');
          window.location = link.get('href');
        }
      });
      document.addEvent('touchmove', function() {
        $$('article.touched').removeClass('touched');
      });
    });
  }
  
  if (!window.location.href.contains('#')) {
    window.scrollTo(0, 1);
  }
  
});

var LocalData = new Class({
  
  topics: {},
  replies: {},
  updateFrequency: 2 * 60 * 1000, // update every two minutes
  
  initialize: function() {
    if (localStorage.topics) {
      this.topics = JSON.decode(localStorage.topics);
    }
    if (localStorage.replies) {
      this.replies = JSON.decode(localStorage.replies);
    }
    this.indexPosts();
  },
  
  indexPosts: function() {
    
    this.authors = {};
    this.locations = {};
    
    var indexAuthor = function(post) {
      var author = post.author.toLowerCase();
      if (!this.authors[author]) {
        this.authors[author] = [];
      }
      this.authors[author].push(post);
    }.bind(this);
    
    var indexLocation = function(post) {
      var loc = post.location.toLowerCase();
      if (!this.locations[loc]) {
        this.locations[loc] = [];
      }
      this.locations[loc].push(post);
    }.bind(this);
    
    for (var id in this.topics) {
      this.topics[id].reply_count = 0;
      indexAuthor(this.topics[id]);
      indexLocation(this.topics[id]);
    }
    for (var id in this.replies) {
      var topic_id = this.replies[id].topic_id;
      this.topics[topic_id].reply_count++;
      indexAuthor(this.replies[id]);
      indexLocation(this.replies[id]);
    }
  },
  
  itsPeanutButterJellyTime: function() {
    var timestamp = new Date().getTime();
    var lastUpdate = parseInt(localStorage.updated, 10);
    return (!localStorage.updated ||                          // never updated
            timestamp - lastUpdate > this.updateFrequency);   // cache expired
  },
  
  check: function() {
    localStorage.updated = new Date().getTime();
    new Request({
      url: '?x=sync_data',
      onComplete: this.handleCheckResponse.bind(this)
    }).post({
      known_topics: Object.keys(this.topics).join(','),
      known_replies: Object.keys(this.replies).join(',')
    });
  },
  
  handleCheckResponse: function(response) {
    var data = JSON.decode(response);
    for (var id in data.topics) {
      if (!this.topics[id]) {
        this.topics[id] = data.topics[id];
      }
    }
    for (var id in data.replies) {
      if (!this.replies[id]) {
        this.replies[id] = data.replies[id];
      }
    }
    localStorage.topics = JSON.encode(this.topics);
    localStorage.replies = JSON.encode(this.replies);
    if (data.send_topics.length > 0 ||
        data.send_replies.length > 0) {
      this.send(data.send_topics, data.send_replies);
    }
  },
  
  send: function(topicIds, replyIds) {
    var topics = [];
    var replies = [];
    topicIds.each(function(id) {
      topics.push(this.topics[id]);
    }.bind(this));
    replyIds.each(function(id) {
      replies.push(this.replies[id]);
    }.bind(this));
    new Request({
      url: '?x=sync_data'
    }).post({
      new_topics: JSON.encode(topics),
      new_replies: JSON.encode(replies)
    });
  },
  
  setupLinks: function() {
    
    // Author links
    $$('.author').each(function(span) {
      if (!span.hasClass('setup')) {
        span.addClass('setup');
        var author = span.get('html');
        span.set('html', '<a href="?x=filter&u=' + encodeURIComponent(author) + '">' + author + '</a>');
      }
    }.bind(this));
    
    // Location links
    $$('.location').each(function(span) {
      if (!span.hasClass('setup')) {
        span.addClass('setup');
        var loc = span.get('html');
        span.set('html', '<a href="?x=filter&l=' + encodeURIComponent(loc) + '">' + loc + '</a>');
      }
    }.bind(this));
    
    var authorRegex = new RegExp('@(' + Object.keys(this.authors).join('|') + ')', 'i');
    var urlRegex = /([-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?)/gi;
    $$('.post .content').each(function(content) {
      var html = content.get('html');
      html = html.replace(authorRegex, '<a href="?x=filter&m=$1" class="handle">@$1</a>');
      html = html.replace(urlRegex, '<a href="$1" class="off-site">$1</a>');
      content.set('html', html);
    }.bind(this));
    
    // Fix URLs
    $$('a.off-site').each(function(link) {
      if (link.get('href').indexOf('@') != -1) {
        link.set('href', 'mailto:' + link.get('href'));
      } else if (link.get('href').indexOf('http') != 0) {
        link.set('href', 'http://' + link.get('href'));
      }
      if ($(document.body).hasClass('offline')) {
        link.addEvent('click', function(e) {
            if (!confirm('This wifi router is not connected to the Internet. Continue anyway?')) {
              new Event(e).stop();
            }
        });
      }
    });
    
  },
  
  setupPagination: function(num) {
    $('pagination').getElement('.from').set('html', '1');
    $('pagination').getElement('.to').set('html', num);
    $('pagination').getElement('.total').set('html', num);
  },
  
  setupAuthorFilter: function() {
    var authorURL = location.href.match(/x=filter&u=(.+)$/);
    if (authorURL) {
      var author = decodeURIComponent(authorURL[1]);
      var posts = this.authors[author.toLowerCase()] || [];
      posts.sort(this.postSort);
      var title = 'posts by ' + author +
                  '<a href="?x=filter&m=' + encodeURIComponent(author) + '">@' + author + ' mentions</a>';
      this.renderPosts(title, posts);
    }
  },
  
  setupLocationFilter: function() {
    var locationURL = location.href.match(/x=filter&l=(.+)$/);
    if (locationURL) {
      var loc = decodeURIComponent(locationURL[1]);
      var posts = this.locations[loc] || [];
      posts.sort(this.postSort);
      var title = 'posts in ' + loc;
      this.renderPosts(title, posts);
    }
  },
  
  setupMentionFilter: function() {
    var mentionURL = location.href.match(/x=filter&m=(.+)$/);
    if (mentionURL) {
      var author = decodeURIComponent(mentionURL[1]);
      var posts = [];
      var regex = new RegExp('@' + author, 'i');
      for (var id in this.topics) {
        var topic = this.topics[id];
        if (topic.content.match(regex)) {
          posts.push(topic);
        }
      }
      for (var id in this.replies) {
        var reply = this.replies[id];
        if (reply.content.match(regex)) {
          posts.push(reply);
        }
      }
      posts.sort(this.postSort);
      var title = '@' + author + ' mentions' +
                  '<a href="?x=filter&u=' + encodeURIComponent(author) + '">posts by ' + author + '</a>';
      this.renderPosts(title, posts);
    }
  },
  
  postSort: function(a, b) {
    if (a.id > b.id) {
      return -1;
    } else if (a.id < b.id) {
      return 1;
    } else if (a.topic_id) {
      return -1;
    } else {
      return 1;
    }
  },
  
  renderPosts: function(title, posts) {
    var root = $('page').get('data-public-root');
    new Request({
      url: root + 'html/post.html',
      onComplete: function(template) {
        $('filter').set('html', title);
        var html = '';
        posts.each(function(post) {
          if (post.topic_id) {
            var topic = this.topics[post.topic_id].content;
            if (topic.length > 50) {
              topic = topic.substr(0, 50) + '...';
            }
            post.meta = ' &middot; reply to <a href="?x=topic&id=' + post.topic_id + '#reply-' + post.id + '">' + topic + '</a>';
          } else {
            if (post.reply_count == 1) {
              post.meta = ' &middot; <a href="?x=topic&id=' + post.id + '">1 comment</a>';
            } else {
              post.meta = ' &middot; <a href="?x=topic&id=' + post.id + '">' + post.reply_count + ' comments</a>';
            }
          }
          html += template.substitute(post);
        }.bind(this));
        $('posts').set('html', html);
        this.setupLinks();
        this.setupPagination(posts.length);
        $(document.body).removeClass('loading');
      }.bind(this)
    }).get();
  }
  
});

var Slides = new Class({
    
  initialize: function(el) {
    this.el = el;
    this.images = el.getElements('img');
    this.holder = el.getElement('.holder');
    this.index = 0;
    this.holder.setStyle('width', this.images.length * 620);
    this.holder.set('tween', {
      duration: 750,
      transition: Fx.Transitions.Quart.easeOut
    });
    
    this.offset = 0;
    window.addEvent('resize', this.resize.bind(this));
    this.resize();
    
    this.el.addEvent('mouseenter', function() {
      this.stopRotation();
    }.bind(this));
    this.el.addEvent('mouseleave', function() {
      this.startRotation();
    }.bind(this));
    
    this.holder.addEvent('mouseenter', function(e) {
      this.el.getElement('.controls .next').addClass('hover');
    }.bind(this));
    this.holder.addEvent('mouseleave', function(e) {
      this.el.getElement('.controls .next').removeClass('hover');
    }.bind(this));
    this.holder.addEvent('click', function(e) {
      this.next();
    }.bind(this));
    this.setupControls();
    this.select(0);
    this.startRotation();
  },
  
  setupControls: function() {
    this.el.getElements('.controls a.page').each(function(link, index) {
      link.addEvent('click', function(e) {
        new Event(e).stop();
        this.select(index);
      }.bind(this));
    }.bind(this));
    this.el.getElement('.controls .next').addEvent('click', function(e) {
      new Event(e).stop();
      this.next();
    }.bind(this));
  },
  
  select: function(index) {
    this.index = index;
    this.holder.tween('left', -index * 620 + this.offset);
    this.el.getElements('.controls .selected').removeClass('selected');
    this.el.getElements('.controls .page')[index].addClass('selected');
    this.el.getElement('.caption').set('html', this.images[index].get('alt'));
    this.startRotation();
  },
  
  next: function() {
    var next = (this.index == this.images.length - 1) ? 0 : this.index + 1;
    this.select(next);
  },
  
  startRotation: function() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.timeout = setTimeout(this.next.bind(this), 8000);
  },
  
  stopRotation: function() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  },
  
  resize: function() {
    if (window.getSize().x < 640) {
      var x = 1 - (window.getSize().x - 277) / (639 - 277);
      this.offset = -175 * x;
    }
  }
  
});
