var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var findOrCreate = require('mongoose-findorcreate')

var Comms = new Schema({
    channel: String,
    title: String,
    replies: Number,
    author: String,
    last: String,
});

Comms.plugin(findOrCreate);

module.exports = mongoose.model('Comms', Comms);