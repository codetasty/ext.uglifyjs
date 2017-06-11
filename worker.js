importScripts('uglifyjs.js');

var Compiler = function(id, source) {
	this.id = id;
	this.source = source;
	this.files = source.map(function(path) {
		return {
			path: path,
			file: null,
		};
	});
	
	this.compiled = 0;
};

(function() {
	this.output = function() {
		return this.files.map(function(file) {
			return file.file;
		}).join("\n");
	};
	
	this.destroy = function() {
		this.files = null;
	};
}).call(Compiler.prototype);

var CompilerManager = function(worker) {
	var self = this;
	
	this.worker = worker;
	this.compilers = {};
	
	this.onWorkerMessage = function(data) {
		switch (data.action) {
			case 'compile':
				this.addCompiler(data.id, data.source);
			break;
			
			case 'file':
				this.file(data.id, data.path, data.file);
			break;
		}
	};
	
	this.addCompiler = function(id, source) {
		if (this.compilers[id]) {
			return;
		}
		
		this.compilers[id] = new Compiler(id, source);
	};
	
	this.removeCompiler = function(id) {
		this.compilers[id] = null;
		delete this.compilers[id];
	};
	
	this.file = function(id, path, file) {
		var compiler = this.compilers[id];
		
		if (!compiler) {
			return;
		}
		
		var minified = UglifyJS.minify(file);
		
		if (minified.error) {
			this.worker.postMessage({
				action: 'error',
				id: id,
				path: path,
				error: minified.error,
			});
			
			compiler.destroy();
			this.removeCompiler(compiler.id);
			return;
		}
		
		for (var i = 0; i < compiler.files.length; i++) {
			if (compiler.files[i].path === path) {
				compiler.files[i].file = minified.code;
				compiler.compiled++;
				break;
			}
		}
		
		if (compiler.compiled === compiler.files.length) {
			this.done(id);
		}
	};
	
	this.done = function(id, data) {
		var compiler = this.compilers[id];
		
		if (!compiler) {
			return;
		}
		
		this.worker.postMessage({
			action: 'output',
			id: id,
			data: compiler.output(),
		});
		
		compiler.destroy();
		this.removeCompiler(compiler.id);
	};
	
	this.worker.onmessage = function(e) {
		self.onWorkerMessage(e.data);
	};
};

var manager = new CompilerManager(self);