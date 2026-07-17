from pathlib import Path
from playwright.sync_api import expect, sync_playwright


BASE_URL = "http://127.0.0.1:4173/?seed=123&dev=1"
ARTIFACTS = Path("/private/tmp")
RARITY_CASES = (
    ("C", 7936, "c"),
    ("R", 2976, "r"),
    ("SR", 928, "sr"),
    ("SSR", 96, "ssr"),
    ("UR", 1, "ur"),
)


def assert_no_overflow(page, label):
    dimensions = page.evaluate(
        """() => ({
          viewport: document.documentElement.clientWidth,
          page: document.documentElement.scrollWidth,
        })"""
    )
    assert dimensions["page"] <= dimensions["viewport"] + 1, (
        f"{label} horizontal overflow: {dimensions}"
    )


def assert_images_loaded(page):
    failures = page.evaluate(
        """() => [...document.images]
          .filter(image => !image.complete || image.naturalWidth === 0)
          .map(image => image.getAttribute('src'))"""
    )
    assert not failures, f"Images failed to load: {failures}"


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
    page.add_init_script("localStorage.clear()")
    console_errors = []
    page_errors = []
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    buildup_animations = set()
    core_animations = set()
    reveal_animations = set()

    for rarity, seed, presented in RARITY_CASES:
        page.goto(f"http://127.0.0.1:4173/?seed={seed}&dev=1")
        page.wait_for_load_state("networkidle")
        page.locator('.pull-console [data-action="pull-one"]').click()
        expect(page.locator("#cinematic-buildup")).to_be_visible()
        expect(page.locator("#cinematic-buildup")).to_have_attribute("data-rarity", presented)
        expect(page.locator("#warp-backdrop")).to_have_attribute(
            "src", f"./assets/generated/rarity-warps/warp-{presented}.webp"
        )
        expect(page.locator("#build-grade")).not_to_be_empty()
        state = page.evaluate("window.__ASTRAL_DEBUG__.getState()")
        assert state["buildBest"] == rarity, f"Seed {seed} produced {state['buildBest']}, expected {rarity}"
        buildup_animations.add(page.locator("#warp-backdrop").evaluate(
            "element => getComputedStyle(element).animationName"
        ))
        core_animations.add(page.locator(".warp-core").evaluate(
            "element => getComputedStyle(element).animationName"
        ))
        page.wait_for_timeout(420)
        page.screenshot(path=str(ARTIFACTS / f"astral-buildup-{presented}.png"))
        page.locator('[data-action="skip-build"]').click()
        expect(page.locator("#cinematic-reveal")).to_be_visible()
        expect(page.locator("#cinematic-reveal")).to_have_attribute("data-rarity", rarity.lower())
        expect(page.locator("#reveal-card img")).to_have_count(1)
        reveal_animations.add(page.locator("#reveal-card").evaluate(
            "element => getComputedStyle(element).animationName"
        ))

    assert len(buildup_animations) == 5, f"Buildup animations are not unique: {buildup_animations}"
    assert len(core_animations) == 5, f"Core animations are not unique: {core_animations}"
    assert len(reveal_animations) == 5, f"Reveal animations are not unique: {reveal_animations}"

    page.goto("http://127.0.0.1:4173/?seed=101&dev=1")
    page.wait_for_load_state("networkidle")
    page.locator('.pull-console [data-action="pull-one"]').click()
    expect(page.locator("#cinematic-buildup")).to_have_attribute("data-rarity", "sr")
    expect(page.locator("#warp-backdrop")).to_have_attribute(
        "src", "./assets/generated/rarity-warps/warp-sr.webp"
    )
    near_miss_state = page.evaluate("window.__ASTRAL_DEBUG__.getState()")
    assert near_miss_state["nearMiss"] is True
    assert near_miss_state["buildBest"] == "SSR"
    page.screenshot(path=str(ARTIFACTS / "astral-buildup-near-miss.png"))
    page.locator('[data-action="skip-build"]').click()
    expect(page.locator("#cinematic-reveal")).to_have_attribute("data-rarity", "ssr")

    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    page.evaluate("document.fonts.ready")
    expect(page.get_by_text("ASTRAL REVERIE", exact=True)).to_be_visible()
    expect(page.locator("#view-banner")).to_be_visible()
    assert_images_loaded(page)
    assert_no_overflow(page, "desktop banner")
    page.locator("#dev-overlay").evaluate("element => element.hidden = true")
    page.screenshot(path=str(ARTIFACTS / "astral-desktop.png"), full_page=True)

    page.locator('.pull-console [data-action="pull-one"]').click()
    expect(page.locator("#cinematic-buildup")).to_be_visible()
    expect(page.locator("#build-grade")).not_to_be_empty()
    page.wait_for_timeout(850)
    page.screenshot(path=str(ARTIFACTS / "astral-buildup.png"), full_page=True)
    page.locator('[data-action="skip-build"]').click()
    expect(page.locator("#cinematic-reveal")).to_be_visible()
    expect(page.locator("#reveal-card img")).to_have_count(1)
    page.wait_for_timeout(900)
    assert_images_loaded(page)
    page.screenshot(path=str(ARTIFACTS / "astral-reveal.png"), full_page=True)
    page.locator('[data-action="advance-reveal"]').click(position={"x": 20, "y": 300})
    expect(page.locator("#cinematic")).to_be_hidden()
    state_after_single = page.evaluate("window.__ASTRAL_DEBUG__.getState()")
    assert state_after_single["totalPulls"] == 1

    page.locator('.pull-console [data-action="pull-ten"]').click()
    expect(page.locator("#cinematic-buildup")).to_be_visible()
    page.locator('[data-action="skip-build"]').click()
    expect(page.locator("#cinematic-reveal")).to_be_visible()
    page.locator('[data-action="reveal-all"]').click()
    expect(page.locator("#cinematic-summary")).to_be_visible()
    expect(page.locator("#summary-grade")).not_to_be_empty()
    summary_state = page.evaluate("window.__ASTRAL_DEBUG__.getState()")
    expect(page.locator("#cinematic-summary")).to_have_attribute(
        "data-rarity", summary_state["buildBest"].lower()
    )
    expect(page.locator(".summary-card")).to_have_count(10)
    expect(page.locator(".summary-card img")).to_have_count(10)
    page.wait_for_timeout(1100)
    assert_images_loaded(page)
    page.screenshot(path=str(ARTIFACTS / "astral-summary.png"), full_page=True)
    page.locator('[data-action="collect"]').click()
    expect(page.locator("#cinematic")).to_be_hidden()

    page.locator('[data-view="album"]').click()
    expect(page.locator("#view-album")).to_be_visible()
    assert page.locator(".album-card:not(.is-locked)").count() > 0
    assert page.locator(".album-card:not(.is-locked) img").count() == page.locator(".album-card:not(.is-locked)").count()

    page.locator('[data-view="stats"]').click()
    expect(page.locator("#view-stats")).to_be_visible()
    expect(page.locator(".stat-row")).to_have_count(4)
    page.wait_for_timeout(650)
    page.screenshot(path=str(ARTIFACTS / "astral-stats.png"), full_page=True)

    gems_before = page.evaluate("window.__ASTRAL_DEBUG__.getState().gems")
    page.locator('[data-action="open-topup"]').click()
    expect(page.locator("#topup-sheet")).to_be_visible()
    page.locator('[data-package="0"]').click()
    gems_after = page.evaluate("window.__ASTRAL_DEBUG__.getState().gems")
    assert gems_after == gems_before + 60
    page.locator('[data-action="close-topup"]').click()
    expect(page.locator("#toast")).to_be_hidden(timeout=4000)

    page.set_viewport_size({"width": 390, "height": 844})
    page.locator('[data-view="banner"]').click()
    expect(page.locator("#view-banner")).to_be_visible()
    page.wait_for_timeout(950)
    assert_no_overflow(page, "mobile banner")
    expect(page.locator(".view-tabs")).to_be_visible()
    pull_box = page.locator('.pull-console [data-action="pull-ten"]').bounding_box()
    tabs_box = page.locator(".view-tabs").bounding_box()
    assert pull_box and tabs_box and pull_box["y"] + pull_box["height"] <= tabs_box["y"] + 1, (
        f"Primary mobile pull action is covered by navigation: pull={pull_box}, tabs={tabs_box}"
    )
    page.screenshot(path=str(ARTIFACTS / "astral-mobile.png"), full_page=True)

    page.locator('.pull-console [data-action="pull-one"]').click()
    expect(page.locator("#cinematic-buildup")).to_be_visible()
    page.locator('[data-action="skip-build"]').click()
    expect(page.locator("#cinematic-reveal")).to_be_visible()
    page.wait_for_timeout(900)
    page.screenshot(path=str(ARTIFACTS / "astral-mobile-reveal.png"), full_page=True)
    page.locator('[data-action="advance-reveal"]').click(position={"x": 20, "y": 300})
    expect(page.locator("#cinematic")).to_be_hidden()

    page.emulate_media(reduced_motion="reduce")
    page.locator('.pull-console [data-action="pull-one"]').click()
    expect(page.locator("#cinematic-buildup")).to_be_visible()
    reduced_duration = page.locator(".warp-core").evaluate(
        "element => parseFloat(getComputedStyle(element).animationDuration)"
    )
    assert reduced_duration <= 0.01, f"Reduced-motion buildup duration is {reduced_duration}s"
    page.locator('[data-action="skip-build"]').click()
    expect(page.locator("#cinematic-reveal")).to_be_visible()
    reduced_reveal_duration = page.locator("#reveal-card").evaluate(
        "element => parseFloat(getComputedStyle(element).animationDuration)"
    )
    assert reduced_reveal_duration <= 0.01, f"Reduced-motion reveal duration is {reduced_reveal_duration}s"
    page.locator('[data-action="advance-reveal"]').click(position={"x": 20, "y": 300})
    expect(page.locator("#cinematic")).to_be_hidden()

    assert not page_errors, f"Page errors: {page_errors}"
    assert not console_errors, f"Console errors: {console_errors}"
    browser.close()

print("Browser QA passed: all rarity buildups, near-miss, desktop, pull ×1, pull ×10, summary, album, stats, top-up, mobile, reduced motion")
