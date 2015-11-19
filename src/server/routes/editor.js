/*
 * Copyright (C) 2015  Ben Ockmore
 *               2015  Sean Burke
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

'use strict';

const express = require('express');
const router = express.Router();
const React = require('react');
const auth = require('../helpers/auth');
const Promise = require('bluebird');
const _ = require('underscore');

const Editor = require('bookbrainz-data').Editor;

const NotFoundError = require('../helpers/error').NotFoundError;
const ProfileForm = React.createFactory(
	require('../../client/components/forms/profile.jsx')
);

router.get('/edit', auth.isAuthenticated, function(req, res, next) {
	new Editor({id: parseInt(req.user.id, 10)})
	.fetch()
	.then((editor) => {
		var markup = React.renderToString(ProfileForm(editor.toJSON()));

		res.render('editor/edit', {
			props: editor.toJSON(),
			markup: markup
		});
	})
	.catch(() => {
		next(new Error('An internal error occurred while loading profile'));
	});
});

router.post('/edit/handler', auth.isAuthenticated, (req, res) => {
	// Should handle errors in some fashion other than redirecting.
	if (req.body.id !== req.user.id) {
		req.session.error = 'You do not have permission to edit that user';
		res.redirect(303, '/editor/edit');
	}

	new Editor({
		id: parseInt(req.body.id, 10), bio: req.body.bio, email:req.body.email
	})
	.save()
	.then((editor) => {
		res.send(editor.toJSON());
	})
	.catch(() => {
		req.session.error = 'An internal error occurred while modifying profile';
		res.redirect(303, '/editor/edit');
	});
});

router.get('/:id', function(req, res, next) {
	var userId = parseInt(req.params.id, 10);

	new Editor({ id: userId })
		.fetch({
			require: true,
			withRelated: ['editorType', 'gender']
		})
		.then((editor) => {
			var editorJSON = editor.toJSON();

			if (!req.user || userId !== req.user.id) {
				editorJSON = _.omit(editorJSON, ['password', 'email']);
			}

			res.render('editor/editor', {
				editor: editorJSON
			});
		})
		.catch(Editor.NotFoundError, (err) => {
			next(new NotFoundError('Editor not found'));
		})
		.catch((err) => {
			var internalError = new Error('An internal error occurred while fetching editor');
			internalError.stack = err.stack;

			next(internalError);
		});
});

router.get('/:id/revisions', (req, res, next) => {
	var userId = parseInt(req.params.id, 10);

	new Editor({ id: userId })
		.fetch({
			require: true,
			withRelated: {
				revisions(query) { query.orderBy('id'); }
			}
		})
		.then((editor) => {
			res.render('editor/revisions', {
				editor: editor.toJSON()
			});
		})
		.catch(Editor.NotFoundError, (err) => {
			console.log(err.stack);
			next(new NotFoundError('Editor not found'));
		})
		.catch((err) => {
			console.log(err.stack);
			next(new Error('An internal error occurred while fetching revisions'));
		});
});

module.exports = router;
