import testcase from './testcase.json' with { type: 'json' }
import tcSafety from './tcSafety.json' with { type: 'json' }
import tcPrevention from './tcPrevention.json' with { type: 'json' }
import tcApp from './tcApp.json' with { type: 'json' }
import tcBench from './tcBench.json' with { type: 'json' }
import tcGates from './tcGates.json' with { type: 'json' }

/** The Test case namespaces that are not part of the first load: added to i18next when the overlay opens (see `loadTestCaseLocales`). */
export default { testcase, tcSafety, tcPrevention, tcApp, tcBench, tcGates }
