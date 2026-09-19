<script lang="ts">
  import { onMount } from "svelte";
  import ChoiceCardGroup from "$lib/components/ChoiceCardGroup.svelte";
  import FormRow from "$lib/components/FormRow.svelte";
  import FormSection from "$lib/components/FormSection.svelte";
  import {
    getUiLocaleSettings,
    isUiAppearance,
    setUiAppearanceSettings,
    setUiLocaleSettings,
    type UiAppearance,
  } from "$lib/settings";
  import {
    guessLocaleFromSystem,
    isUiLocale,
    t,
    type UiLocale,
  } from "$lib/i18n";

  type Props = {
    active: boolean;
    locale: UiLocale;
    appearance: UiAppearance;
    appendLog: (line: string) => void;
    onLocaleChange: (locale: UiLocale) => void;
    onAppearanceChange: (appearance: UiAppearance) => void;
  };

  let {
    active,
    locale,
    appearance,
    appendLog,
    onLocaleChange,
    onAppearanceChange,
  }: Props = $props();

  let localeReady = $state(false);
  let localeSaving = $state(false);
  let appearanceSaveSeq = 0;

  const appearanceItems = $derived([
    {
      value: "system",
      label: t("settings.appearance.system", locale),
      schematic: "appearance-system" as const,
    },
    {
      value: "dark",
      label: t("settings.appearance.dark", locale),
      schematic: "appearance-dark" as const,
    },
    {
      value: "light",
      label: t("settings.appearance.light", locale),
      schematic: "appearance-light" as const,
    },
  ]);

  async function onAppearanceSelect(value: string) {
    if (!isUiAppearance(value)) return;
    const previous = appearance;
    onAppearanceChange(value);
    const seq = ++appearanceSaveSeq;
    try {
      const saved = await setUiAppearanceSettings(value);
      if (seq !== appearanceSaveSeq) return;
      onAppearanceChange(saved);
    } catch (err) {
      if (seq !== appearanceSaveSeq) return;
      onAppearanceChange(previous);
      appendLog(`appearance save failed: ${String(err)}`);
    }
  }

  async function onLocaleSelect(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (!isUiLocale(value)) return;
    const previous = locale;
    onLocaleChange(value);
    localeSaving = true;
    try {
      const saved = await setUiLocaleSettings(value);
      onLocaleChange(saved);
    } catch (err) {
      onLocaleChange(previous);
      appendLog(`locale save failed: ${String(err)}`);
    } finally {
      localeSaving = false;
    }
  }

  onMount(() => {
    let cancelled = false;

    void (async () => {
      try {
        const stored = await getUiLocaleSettings();
        if (!cancelled) {
          if (stored) {
            onLocaleChange(stored);
          } else {
            const guessed = guessLocaleFromSystem();
            onLocaleChange(guessed);
            try {
              await setUiLocaleSettings(guessed);
            } catch (err) {
              appendLog(`locale save failed: ${String(err)}`);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          onLocaleChange(guessLocaleFromSystem());
          appendLog(`locale load failed: ${String(err)}`);
        }
      } finally {
        if (!cancelled) localeReady = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  });
</script>

<div
  class="panel appearance-panel"
  id="panel-appearance"
  role="tabpanel"
  aria-labelledby="tab-appearance"
  hidden={!active}
  inert={!active}
>
  <FormSection
    title={t("settings.appearance", locale)}
    titleId="setting-appearance-heading"
  >
    <FormRow
      hint={t("settings.appearanceHint", locale)}
      hintId="setting-appearance-hint"
      stack
    >
      <ChoiceCardGroup
        name="ui-appearance"
        value={appearance}
        items={appearanceItems}
        labelledBy="setting-appearance-heading"
        onChange={(value) => void onAppearanceSelect(value)}
      />
    </FormRow>
  </FormSection>

  <FormSection
    title={t("settings.language", locale)}
    titleId="setting-language-heading"
  >
    <FormRow>
      <select
        id="setting-language"
        value={locale}
        disabled={!localeReady || localeSaving}
        aria-labelledby="setting-language-heading"
        onchange={onLocaleSelect}
      >
        <option value="en">{t("settings.language.en", locale)}</option>
        <option value="zh">{t("settings.language.zh", locale)}</option>
      </select>
    </FormRow>
  </FormSection>
</div>

<style>
  .panel {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding-inline: var(--panel-pad-x);
    overflow-x: hidden;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .panel[hidden] {
    display: none;
  }

  .panel::-webkit-scrollbar {
    width: 0;
    height: 0;
  }
</style>
