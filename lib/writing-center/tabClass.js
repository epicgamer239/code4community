/** Shared Writing Center dashboard tab button classes. */
export function writingCenterTabClass(activeTab, tab) {
  return `whitespace-nowrap py-2 px-3 rounded-md text-sm font-medium transition-colors ${
    activeTab === tab
      ? "bg-indigo-100 text-indigo-700"
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  }`;
}
