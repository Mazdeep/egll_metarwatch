/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WatchFace } from './components/WatchFace';

export default function App() {
  return (
    <main className="w-full h-[100dvh] bg-black text-white flex items-center justify-center m-0 p-0 overflow-hidden font-sans">
      <WatchFace />
    </main>
  );
}
