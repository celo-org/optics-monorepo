import { expect } from 'chai';
import { OpticsContext } from '@optics-xyz/multi-provider';

describe('optics multi-provider', () => {
  it('compiles', () => {
    expect(OpticsContext).to.not.be.undefined;
  });
});
