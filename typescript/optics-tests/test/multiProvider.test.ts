import { expect } from 'chai';
import { OpticsContext } from '../../optics-provider';

describe('optics multi-provider', () => {
  it('compiles', () => {
    expect(OpticsContext).to.not.be.undefined;
  });
});
