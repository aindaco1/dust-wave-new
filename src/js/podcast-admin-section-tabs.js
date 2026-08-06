function sectionTitle(panel) {
  return panel?.querySelector?.(":scope > summary h2, :scope > summary h3")
    ?.textContent
    ?.trim() || "";
}

function sectionValue(panel, index) {
  return String(
    panel?.dataset?.podcastWorkspaceGroup
    || panel?.dataset?.podcastSectionValue
    || `section-${index + 1}`
  );
}

export function podcastAdminSectionModels(panels) {
  return Array.from(panels || [])
    .map((panel, index) => ({
      index,
      label: sectionTitle(panel),
      panel,
      value: sectionValue(panel, index)
    }))
    .filter(({ label, panel }) => label && panel?.ownerDocument);
}

export function mountPodcastAdminSectionTabs({
  panels,
  label,
  idPrefix,
  storageKey,
  mountTabs
}) {
  const sections = podcastAdminSectionModels(panels);
  if (sections.length < 2) return null;
  if (typeof mountTabs !== "function") {
    throw new TypeError("A shared accessible-tab mount function is required");
  }

  const document = sections[0].panel.ownerDocument;
  const firstPanel = sections[0].panel;
  const parent = firstPanel.parentNode;
  const root = document.createElement("section");
  root.className = "podcast-admin__section-switcher";
  root.dataset.podcastSectionTabs = idPrefix;
  root.style.setProperty("--podcast-section-count", sections.length);

  const navigation = document.createElement("nav");
  navigation.className = "podcast-admin__section-navigation";
  navigation.setAttribute("aria-label", label);
  const tabList = document.createElement("div");
  tabList.className = "podcast-admin__tab-list podcast-admin__section-tab-list";
  tabList.setAttribute("role", "tablist");
  tabList.setAttribute("aria-label", label);
  navigation.append(tabList);
  root.append(navigation);
  parent.insertBefore(root, firstPanel);

  const initiallyOpen = sections.find(({ panel }) => panel.open)?.value
    || sections[0].value;
  for (const { index, label: sectionLabel, panel, value } of sections) {
    const tab = document.createElement("button");
    tab.id = `${idPrefix}-tab-${index + 1}`;
    tab.type = "button";
    tab.dataset.tab = value;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", `${idPrefix}-panel-${index + 1}`);
    tab.textContent = sectionLabel;
    tabList.append(tab);

    panel.id = `${idPrefix}-panel-${index + 1}`;
    panel.dataset.podcastSectionPanel = value;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tab.id);
    const content = panel.querySelector(
      ":scope > .podcast-admin__progressive-body "
      + "> .podcast-admin__workspace-content"
    );
    if (content) content.setAttribute("aria-labelledby", tab.id);
    root.append(panel);
  }

  const tabs = mountTabs(root, {
    initialTab: initiallyOpen,
    responsiveSelect: {
      id: `${idPrefix}-mobile`,
      label
    },
    storageKey,
    onSelect(name) {
      for (const { panel, value } of sections) {
        panel.open = value === name;
      }
    }
  });

  return {
    root,
    sections,
    select: tabs.select,
    tabs
  };
}

export function mountPodcastAdminContextualTabs({
  root,
  text,
  tabs
}) {
  const configurations = [
    {
      label: text("marketingSectionsAria"),
      name: "marketing",
      selector: "#podcast-panel-marketing > details[data-progressive-tool]"
    },
    {
      label: text("audienceSectionsAria"),
      name: "audience",
      selector: "#podcast-panel-audience > [data-podcast-workspace-group]"
    },
    {
      label: text("monetizationSectionsAria"),
      name: "monetization",
      selector:
        "#podcast-panel-monetization > [data-podcast-workspace-group]"
    }
  ];

  return configurations.map(({ label, name, selector }) => (
    mountPodcastAdminSectionTabs({
      panels: root.querySelectorAll(selector),
      label,
      idPrefix: `podcast-${name}-sections`,
      storageKey: `dustwave-podcast-${name}-section`,
      mountTabs: tabs
    })
  ));
}
