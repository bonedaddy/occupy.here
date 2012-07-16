<?php

require_once dirname(__FILE__) . '/functions.php';

$this->db = new Grid_Database();
setup_meta();
setup_user();

$no_layout = array(
  'layout' => false
);

$this->get('/', 'home');
$this->get('/intro', 'wispr_intro');
$this->get('/library/test/success.html', 'wispr_check', $no_layout);
$this->get('/about', 'about');
$this->get('/account', 'account');
$this->get('/logout', 'logout');
$this->get('/$type.$digits', 'detail');

$this->get('/media', 'media/media');
$this->get('/media/$id', 'media/file');
$this->get('/forum', 'forum/forum');
$this->get('/forum/$id', 'forum/topic');


$this->post('/api/wispr_done', 'api/wispr_done', $no_layout);
$this->post('/api/post_topic', 'api/post_topic', $no_layout);
$this->post('/api/post_reply', 'api/post_reply', $no_layout);
$this->post('/api/update_account', 'api/update_account', $no_layout);
$this->post('/api/set_time', 'api/set_time', $no_layout);
$this->post('/api/sync_data', 'api/sync_data', $no_layout);
$this->post('/api/preview', 'api/preview', $no_layout);
$this->post('/api/upload_file', 'api/upload_file', $no_layout);
$this->post('/api/post_file', 'api/post_file', $no_layout);

?>
