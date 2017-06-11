define(function(require, exports, module) {
	var ExtensionManager = require('core/extensionManager');
	
	var App = require('core/app');
	var Utils = require('core/utils');
	var FileManager = require('core/fileManager');
	
	var EditorEditors = require('modules/editor/ext/editors');
	var EditorCompiler = require('modules/editor/ext/compiler');
	
	var Extension = ExtensionManager.register({
		name: 'uglifyjs',
	}, {
		worker: null,
		compilerName: 'UglifyJS',
		init: function() {
			var self = this;
			
			this.worker = new Worker(this.getBaseUrl() + '/worker.js');
			
			this.worker.onmessage = function(e) {
				self.onWorker(e.data);
			};
			
			EditorCompiler.addWatcher(this.name, {
				property: 'source',
				extensions: ['js'],
				watch: this.onWatch.bind(this),
			});
		},
		destroy: function() {
			this.worker.terminate();
			this.worker = null;
			
			EditorCompiler.removeWatcher(this.name);
		},
		onWatch: function(workspaceId, obj, session, value) {
			EditorCompiler.addCompiler(this.compilerName, workspaceId, obj, function(compiler) {
				this.worker.postMessage({
					action: 'compile',
					id: compiler.id,
					source: compiler.source
				});
				
				compiler.file = this.onFile.bind(this);
			}.bind(this));
		},
		onFile: function(compiler, path, file) {
			if (!this.worker) {
				return EditorCompiler.removeCompiler(compiler);
			}
			
			this.worker.postMessage({
				action: 'file',
				id: compiler.id,
				path: path,
				file: file
			});
		},
		onWorker: function(data) {
			var compiler = EditorCompiler.getCompiler(data.id);
			
			if (!compiler) {
				return;
			}
			
			switch (data.action) {
				case 'output':
					EditorCompiler.saveOutput(compiler, data.data);
				break;
				
				case 'error':
					compiler.destroy(new Error(
							__('%s on <strong>%s:%s</strong> in file <strong>%s</strong>.', data.error.message, data.error.line, data.error.pos, Utils.path.humanize(data.path))
					));
					EditorCompiler.removeCompiler(compiler);
				break;
			}
		}
	});
	
	module.exports = Extension.api();
});