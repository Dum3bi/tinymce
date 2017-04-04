define(
  'ephox.alloy.api.ui.Form',

  [
    'ephox.alloy.api.behaviour.Composing',
    'ephox.alloy.api.behaviour.Representing',
    'ephox.alloy.api.ui.UiSketcher',
    'ephox.alloy.parts.PartType',
    'ephox.alloy.spec.SpecSchema',
    'ephox.alloy.spec.UiSubstitutes',
    'ephox.boulder.api.FieldSchema',
    'ephox.katamari.api.Arr',
    'ephox.katamari.api.Obj',
    'ephox.katamari.api.Merger',
    'ephox.katamari.api.Fun',
    'ephox.katamari.api.Option'
  ],

  function (Composing, Representing, UiSketcher, PartType, SpecSchema, UiSubstitutes, FieldSchema, Arr, Obj, Merger, Fun, Option) {
    var schema = [
      
    ];

    var sketch = function (rawSpec) {
      var spec = UiSketcher.supplyUid(rawSpec);
      var partSchemas = Arr.map(
        Obj.keys(rawSpec.parts),
        function (p) {
          return FieldSchema.strictObjOf(p, schema.concat([
            FieldSchema.state(PartType.original(), Fun.identity)
          ]));
        }
      );

      var detail = SpecSchema.asStructOrDie('form', schema, spec, partSchemas);

      var placeholders = Obj.tupleMap(spec.parts !== undefined ? spec.parts : {}, function (partSpec, partName) {
        return {
          k: '<alloy.field.' + partName + '>',
          v: UiSubstitutes.single(true, function () {
            var partUid = detail.partUids()[partName];
            return Merger.deepMerge(
              // could use entirety here.
              partSpec,
              {
                uid: partUid
              }
            );
          })
        };
      });

      var components = UiSubstitutes.substitutePlaces(
        Option.some('form'),
        detail,
        detail.components(),
        placeholders
      );

    
      return make(detail, components, spec);
    };

    var make = function (detail, components, spec) {
      return Merger.deepMerge(
        spec,
        {
          'debug.sketcher': 'Form',
          uid: detail.uid(),
          dom: detail.dom(),
          components: components,

          behaviours: {
            representing: {
              store: {
                mode: 'manual',
                getValue: function (form) {
                  var partUids = detail.partUids();
                  return Obj.map(partUids, function (pUid, pName) {
                    return form.getSystem().getByUid(pUid).fold(Option.none, Option.some).bind(Composing.getCurrent).map(Representing.getValue);
                  });
                },
                setValue: function (form, values) {
                  Obj.each(values, function (newValue, key) {
                    // TODO: Make this cleaner. Maybe make the whole thing need to be specified.
                    // This should ignore things that it cannot find which helps with dynamic forms but may be undesirable
                    var part = form.getSystem().getByUid(detail.partUids()[key]).fold(Option.none, Option.some).bind(Composing.getCurrent);
                    part.each(function (current) {
                      Representing.setValue(current, newValue);
                    });
                  });
                }
              }
            }
          }
        }
      );

    };


    var parts = function (partName) {
      // FIX: Breaking abstraction
      return {
        uiType: UiSubstitutes.placeholder(),
        owner: 'form',
        name: '<alloy.field.' + partName + '>'
      };
    };

    return {
      sketch: sketch,
      parts: parts
    };
  }
);