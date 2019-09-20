import { ValueSchema } from '@ephox/boulder';
import { window } from '@ephox/dom-globals';
import { Adt, Fun, Option } from '@ephox/katamari';
import { Css, Element, Location, VisualViewport } from '@ephox/sugar';

import * as AriaFocus from '../../alien/AriaFocus';
import { Bounds, box } from '../../alien/Boxes';
import { AlloyComponent } from '../../api/component/ComponentApi';
import { Stateless } from '../../behaviour/common/BehaviourState';
import { AnchorDetail, Anchoring, AnchorSpec } from '../../positioning/mode/Anchoring';
import AnchorSchema from '../../positioning/mode/AnchorSchema';
import * as Anchor from '../../positioning/layout/Anchor';
import * as Origins from '../../positioning/layout/Origins';
import * as SimpleLayout from '../../positioning/layout/SimpleLayout';
import { PositioningConfig } from './PositioningTypes';

export interface OriginAdt extends Adt { }

const getFixedOrigin = (): OriginAdt => {
  const bounds = VisualViewport.getBounds(window);
  return Origins.fixed(0, 0, bounds.width(), bounds.height());
};

const getRelativeOrigin = (component: AlloyComponent): OriginAdt => {
  const position = Location.absolute(component.element());
  const bounds = component.element().dom().getBoundingClientRect();

  // We think that this just needs to be kept consistent with Boxes.win. If we remove the scroll values from Boxes.win, we
  // should change this to just bounds.left and bounds.top from getBoundingClientRect
  return Origins.relative(position.left(), position.top(), bounds.width, bounds.height);
};

const place = (component: AlloyComponent, origin: OriginAdt, anchoring: Anchoring, getBounds: Option<() => Bounds>, placee: AlloyComponent): void => {
  const anchor = Anchor.box(anchoring.anchorBox, origin);
  SimpleLayout.simple(anchor, placee.element(), anchoring.bubble, anchoring.layouts, getBounds, anchoring.overrides);
};

const position = (component: AlloyComponent, posConfig: PositioningConfig, posState: Stateless, anchor: AnchorSpec, placee: AlloyComponent): void => {
  positionWithin(component, posConfig, posState, anchor, placee, Option.none());
};

const positionWithin = (component: AlloyComponent, posConfig: PositioningConfig, posState: Stateless, anchor: AnchorSpec, placee: AlloyComponent, boxElement: Option<Element>): void => {
  const boundsBox = boxElement.map(box);
  return positionWithinBounds(component, posConfig, posState, anchor, placee, boundsBox);
};

const positionWithinBounds = (component: AlloyComponent, posConfig: PositioningConfig, posState: Stateless, anchor: AnchorSpec, placee: AlloyComponent, bounds: Option<Bounds>): void => {
  const anchorage: AnchorDetail<any> = ValueSchema.asRawOrDie('positioning anchor.info', AnchorSchema, anchor);

  // Preserve the focus as IE 11 loses it when setting visibility to hidden
  AriaFocus.preserve(() => {
    // We set it to be fixed, so that it doesn't interfere with the layout of anything
    // when calculating anchors
    Css.set(placee.element(), 'position', 'fixed');

    const oldVisibility = Css.getRaw(placee.element(), 'visibility');
    Css.set(placee.element(), 'visibility', 'hidden');

    // We need to calculate the origin (esp. the bounding client rect) *after* we have done
    // all the preprocessing of the component and placee. Otherwise, the relative positions
    // (bottom and right) will be using the wrong dimensions
    const origin = posConfig.useFixed() ? getFixedOrigin() : getRelativeOrigin(component);

    const placer = anchorage.placement;

    const getBounds = bounds.map(Fun.constant).or(posConfig.getBounds);

    placer(component, anchorage, origin).each((anchoring) => {
      const doPlace = anchoring.placer.getOr(place);
      doPlace(component, origin, anchoring, getBounds, placee);
    });

    oldVisibility.fold(() => {
      Css.remove(placee.element(), 'visibility');
    }, (vis) => {
      Css.set(placee.element(), 'visibility', vis);
    });

    // We need to remove position: fixed put on by above code if it is not needed.
    if (
      Css.getRaw(placee.element(), 'left').isNone() &&
      Css.getRaw(placee.element(), 'top').isNone() &&
      Css.getRaw(placee.element(), 'right').isNone() &&
      Css.getRaw(placee.element(), 'bottom').isNone() &&
      Css.getRaw(placee.element(), 'position').is('fixed')
    ) { Css.remove(placee.element(), 'position'); }
  }, placee.element());
};

const getMode = (component: AlloyComponent, pConfig: PositioningConfig, pState: Stateless): string => {
  return pConfig.useFixed() ? 'fixed' : 'absolute';
};

export {
  position,
  positionWithin,
  positionWithinBounds,
  getMode
};
