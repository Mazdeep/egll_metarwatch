/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WatchFace } from './components/WatchFace';

export default function App() {
  return (
    <main className="w-screen h-screen bg-black text-white flex items-center justify-center m-0 p-0 overflow-hidden">
      <WatchFace />
    </main>
  );
}
