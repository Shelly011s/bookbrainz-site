var express = require('express');
var router = express.Router();
var request = require('superagent');
require('superagent-bluebird-promise');

/* create publication endpoint */
router.get('/publication/create', function(req, res) {
  // Get the list of publication types
  var ws = req.app.get('webservice');
  request.get(ws + '/publicationType').promise().then(function(types) {
    res.render('entity/create/publication', {
      session: req.session,
      publicationTypes: types.body
    });
  });
});


router.post('/publication/create/handler', function(req, res) {
  var ws = req.app.get('webservice');

  console.log(req.body);

  if (!req.body.editId) {
    console.log('Make new edit!');
  }
  // If 'new edit' in form, create a new edit.
  var editPromise = request.post(ws + '/edits')
  .set('Authorization', 'Bearer ' + req.session.oauth.access_token).promise();

  var changes = {
    'entity_gid': [],
    'publication_data': {
      'publication_type_id': req.body.publicationTypeId
    }
  };

  if (req.body.disambiguation) {
    changes.disambiguation = req.body.disambiguation;
  }

  if (req.body.annotation) {
    changes.annotation = req.body.annotation;
  }

  changes.aliases = req.body.aliases.map(function(alias) {
    return {
      'name': alias.name,
      'sort_name': alias.sortName,
      'language_id': 1
    };
  });

  editPromise.then(function(edit) {
    changes.edit_id = edit.body.id;

    request.post(ws + '/revisions')
    .set('Authorization', 'Bearer ' + req.session.oauth.access_token)
    .send(changes).promise()
    .then(function(revision) {
      res.send(revision.body);
    });
  });
});

module.exports = router;
