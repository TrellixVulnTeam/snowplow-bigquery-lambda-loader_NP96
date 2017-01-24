require('./fields.js');
var extend = require('util')._extend;

var Formatter = function() {

};

Formatter.event = (rawData) => {
  var content = rawData.split('\t'),
      result = {};
  var counter = 0;

  FIELDS.forEach((f) => {
    if(typeof(f) === 'object') {
      result[f['field']] = Formatter.sanitize(f['transform'](content[counter ++]));
    } else {
      result[f] = Formatter.sanitize(content[counter ++]);
    }
  });

  return {
    insertId: result['event_id'],
    json: result
  };
};

Formatter.contexts = (evt) => {
  var evtPayload = evt['json'];
  var contexts = JSON.parse(evt['contexts']);
  var subtables = contexts != null ? contexts['data'] : [];

  if(evt['unstruct_event'] !== null) {
    var json = JSON.parse(evt['unstruct_event']);
    if(json !== null && json['data']) {
      subtables.push(json['data']);
    } else {
      console.log("Event %s has this data: %s",
                  evt['event_name'],
                  JSON.stringify(json, null, 2));
    }
  }

  var result = {};
  subtables.forEach((c) => {
    var schemaInfo = c['schema'].replace('iglu:', '').split('/');

    var content = c['data'];

    Object.keys(content).forEach((k) => {
      content.renameProperty(k, k.toUnderscore());
    });

    result[c['schema']] = extend({
      "schema_vendor" : schemaInfo[0],
      "schema_name" : schemaInfo[1],
      "schema_format" : schemaInfo[2],
      "schema_version" : schemaInfo[3],
      "root_id" : evtPayload['event_id'],
      "root_tstamp" : evtPayload['collector_tstamp'],
      "ref_root" : "events",
      "ref_tree" : ['events', schemaInfo[1]], // FIXME: remove this tree build hardcoded
      "ref_parent" : 'events',
    }, content);
  });

  return result;
};

Formatter.sanitize = (value) => {
  if(value === "")
    return null;

  return value;
};

module.exports = Formatter;
