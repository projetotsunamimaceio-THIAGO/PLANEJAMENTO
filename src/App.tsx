/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Calendar from './pages/Calendar';
import Planning from './pages/Planning';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Calendar />} />
        <Route path="/planejamento" element={<Planning />} />
      </Routes>
    </BrowserRouter>
  );
}
