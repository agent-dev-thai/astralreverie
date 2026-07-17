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
          .filter(image => image.hasAttribute('src') && (!image.complete || image.naturalWidth === 0))
          .map(image => image.getAttribute('src'))"""
    )
    assert not failures, f"Images failed to load: {failures}"


def expect_cinematic_sfx(page, kind, key):
    page.wait_for_function(
        """expected => window.__ASTRAL_DEBUG__
          .getAudio().cinematicSfx?.[expected.kind] === expected.key""",
        arg={"kind": kind, "key": key},
    )


def expect_pull_og(page, shared_url, artifact_name):
    expected_image_url = shared_url.replace(
        "/?pull=", "/og/pull-v1.jpg?pull=", 1
    )
    expect(page.locator('meta[property="og:image"]')).to_have_attribute(
        "content", expected_image_url
    )
    expect(page.locator('meta[name="twitter:image"]')).to_have_attribute(
        "content", expected_image_url
    )
    response = page.request.get(expected_image_url)
    assert response.ok, f"Pull OG request failed: {response.status} {expected_image_url}"
    assert response.headers.get("content-type") == "image/jpeg"
    image = response.body()
    assert len(image) > 50_000, f"Pull OG image is unexpectedly small: {len(image)}"
    (ARTIFACTS / artifact_name).write_bytes(image)


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
        expect(page.locator("#build-rarity")).to_have_text(presented.upper())
        expect(page.locator("#warp-backdrop")).to_have_attribute(
            "src", f"./assets/generated/rarity-warps/warp-{presented}.webp"
        )
        expect(page.locator("#warp-video")).to_have_attribute(
            "src", f"./assets/generated/cinematics/landscape/warp-{presented}.mp4"
        )
        expect(page.locator("#warp-video")).to_have_class("warp-video is-ready")
        expect_cinematic_sfx(page, "buildup", presented)
        expect(page.locator("#build-grade")).not_to_be_empty()
        state = page.evaluate("window.__ASTRAL_DEBUG__.getState()")
        assert state["buildBest"] == rarity, f"Seed {seed} produced {state['buildBest']}, expected {rarity}"
        buildup_animations.add(page.locator("#warp-backdrop").evaluate(
            "element => getComputedStyle(element).animationName"
        ))
        core_animations.add(page.locator(".warp-core").evaluate(
            "element => getComputedStyle(element).animationName"
        ))
        presentation = page.evaluate("window.__ASTRAL_DEBUG__.getPresentation()")
        active_duration = (
            presentation["videoDurationMs"]
            if presentation["video"]["enabled"]
            else presentation["fallbackDurationMs"]
        )
        peak_delay = min(
            active_duration - 260,
            round(active_duration * (0.3 if rarity in ("SSR", "UR") else 0.4) + 650),
        )
        page.wait_for_timeout(peak_delay)
        build_rarity_opacity = float(page.locator("#build-rarity").evaluate(
            "element => getComputedStyle(element).opacity"
        ))
        assert build_rarity_opacity >= (0.5 if rarity in ("SSR", "UR") else 0.22), (
            f"{rarity} buildup wordmark is too quiet: {build_rarity_opacity}"
        )
        page.screenshot(path=str(ARTIFACTS / f"astral-buildup-{presented}.png"))
        page.evaluate("window.__ASTRAL_DEBUG__.skip()")
        expect(page.locator("#cinematic-reveal")).to_be_visible()
        assert_images_loaded(page)
        expect_cinematic_sfx(page, "reveal", rarity.lower())
        expect(page.locator("#cinematic-reveal")).to_have_attribute("data-rarity", rarity.lower())
        expect(page.locator("#reveal-tier")).to_have_text(rarity)
        expect(page.locator("#rarity-frame")).to_have_attribute("data-rarity", rarity.lower())
        expect(page.locator("#reveal-card img")).to_have_count(1)
        premium_chip = page.locator("#reveal-card .premium-tier-chip")
        if rarity in ("SSR", "UR"):
            expect(premium_chip).to_have_count(1)
            assert f"rarity-chip-{rarity.lower()}.webp" in premium_chip.evaluate(
                "element => getComputedStyle(element).backgroundImage"
            )
        else:
            expect(premium_chip).to_have_count(0)
        reveal_animations.add(page.locator("#reveal-card").evaluate(
            "element => getComputedStyle(element).animationName"
        ))
        page.wait_for_timeout(620)
        page.screenshot(path=str(ARTIFACTS / f"astral-reveal-{rarity.lower()}.png"))

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
    expect(page.locator("#warp-video")).to_have_attribute(
        "src", "./assets/generated/cinematics/landscape/warp-near-miss.mp4"
    )
    expect(page.locator("#warp-video")).to_have_class("warp-video is-ready")
    expect_cinematic_sfx(page, "buildup", "near-miss")
    near_miss_state = page.evaluate("window.__ASTRAL_DEBUG__.getState()")
    assert near_miss_state["nearMiss"] is True
    assert near_miss_state["buildBest"] == "SSR"
    page.screenshot(path=str(ARTIFACTS / "astral-buildup-near-miss.png"))
    page.locator('[data-action="skip-build"]').click()
    expect(page.locator("#cinematic-reveal")).to_have_attribute("data-rarity", "ssr")
    expect_cinematic_sfx(page, "reveal", "ssr")
    revealed_card = page.evaluate("window.__ASTRAL_DEBUG__.getState().results[0]")
    page.evaluate("""window.open = url => {
      window.__FACEBOOK_SHARE_URL__ = url;
      return {};
    }""")
    page.locator(".reveal-share").click()
    reveal_after_share = page.evaluate("window.__ASTRAL_DEBUG__.getState()")
    assert reveal_after_share["phase"] == "reveal" and reveal_after_share["revealIndex"] == 0
    shared_card_url = page.evaluate(
        "() => new URL(window.__FACEBOOK_SHARE_URL__).searchParams.get('u')"
    )
    assert shared_card_url.endswith(f"?pull=v1.{revealed_card['id']}")

    page.goto(shared_card_url)
    page.wait_for_load_state("networkidle")
    expect(page.locator("#cinematic-summary")).to_have_class("cinematic-stage cinematic-summary is-single")
    expect(page.locator(".summary-card")).to_have_count(1)
    expect(page.locator(".summary-name")).to_have_text(revealed_card["name"])
    expect(page.locator(".summary-share")).to_have_text("Share card")
    expect(page.locator('meta[property="og:url"]')).to_have_attribute("content", shared_card_url)
    expect_pull_og(page, shared_card_url, "astral-og-shared-card.jpg")
    page.screenshot(path=str(ARTIFACTS / "astral-shared-card.png"), full_page=True)

    page.goto("http://127.0.0.1:4173/?seed=4242&dev=1")
    page.wait_for_load_state("networkidle")
    page.evaluate("""window.open = url => {
      window.__FACEBOOK_SHARE_URL__ = url;
      return {};
    }""")
    page.locator('[data-action="share-facebook"]').first.click()
    homepage_share_url = page.evaluate(
        "() => new URL(window.__FACEBOOK_SHARE_URL__).searchParams.get('u')"
    )
    assert homepage_share_url == "http://127.0.0.1:4173/"
    expect(page.locator('[data-action="auto-pull-ten"]')).to_be_visible()
    page.locator('[data-action="auto-pull-ten"]').click()
    expect(page.locator("#cinematic-buildup")).to_be_visible()
    auto_state = page.evaluate("window.__ASTRAL_DEBUG__.getState()")
    assert auto_state["autoReveal"] is True
    assert auto_state["totalPulls"] == 10
    expect(page.locator("#cinematic-summary")).to_be_visible(timeout=24000)
    assert_images_loaded(page)
    auto_summary_state = page.evaluate("window.__ASTRAL_DEBUG__.getState()")
    assert auto_summary_state["autoReveal"] is False
    assert len(auto_summary_state["results"]) == 10
    shared_result_names = [result["name"] for result in auto_summary_state["results"]]

    page.locator('[data-action="share-facebook"]').last.click()
    facebook_share_url = page.evaluate("window.__FACEBOOK_SHARE_URL__")
    assert facebook_share_url.startswith("https://www.facebook.com/sharer/sharer.php?")
    shared_page_url = page.evaluate(
        "url => new URL(url).searchParams.get('u')", facebook_share_url
    )
    assert shared_page_url.startswith("http://127.0.0.1:4173/?pull=v1.")
    assert len(shared_page_url.split("?pull=v1.", 1)[1].split(".")) == 10
    assert "seed" not in shared_page_url and "dev" not in shared_page_url
    assert "auto" not in shared_page_url

    page.goto(shared_page_url)
    page.wait_for_load_state("networkidle")
    expect(page.locator("#cinematic-summary")).to_be_visible()
    expect(page.locator("#summary-kicker")).to_have_text("Shared transmission")
    expect(page.locator(".summary-collect")).to_have_text("Enter simulator")
    expect(page).to_have_title("Shared pull — Astral Reverie")
    assert page.locator(".summary-card").count() == 10
    assert page.locator(".summary-name").all_inner_texts() == shared_result_names
    expect(page.locator(".summary-share")).to_have_text("Share ×10 pull")
    expect(page.locator('meta[property="og:url"]')).to_have_attribute("content", shared_page_url)
    expect(page.locator('link[rel="canonical"]')).to_have_attribute("href", "http://127.0.0.1:4173/")
    expect_pull_og(page, shared_page_url, "astral-og-shared-summary.jpg")
    assert page.locator("#app-shell").evaluate("element => element.inert") is True
    expect(page.locator(".summary-share")).to_be_focused()
    page.screenshot(path=str(ARTIFACTS / "astral-shared-summary.png"), full_page=True)
    expect(page.locator("#seed-label")).to_have_text("Shared result · local progress unchanged")
    page.set_viewport_size({"width": 390, "height": 844})
    assert_no_overflow(page, "mobile shared summary")
    page.screenshot(path=str(ARTIFACTS / "astral-shared-summary-mobile.png"), full_page=True)
    page.set_viewport_size({"width": 1440, "height": 1000})

    page.evaluate("""window.open = url => {
      window.__FACEBOOK_SHARE_URL__ = url;
      return {};
    }""")
    page.locator(".summary-share").click()
    reshared_page_url = page.evaluate(
        "() => new URL(window.__FACEBOOK_SHARE_URL__).searchParams.get('u')"
    )
    assert reshared_page_url == shared_page_url
    page.locator(".summary-collect").click()
    expect(page.locator("#cinematic")).to_be_hidden()
    assert "pull=" not in page.url
    assert page.locator("#app-shell").evaluate("element => element.inert") is False

    page.goto("http://127.0.0.1:4173/?pull=v1.unknown")
    page.wait_for_load_state("networkidle")
    expect(page.locator("#cinematic")).to_be_hidden()
    assert "pull=" not in page.url

    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    page.evaluate("document.fonts.ready")
    expect(page.get_by_text("ASTRAL REVERIE", exact=True)).to_be_visible()
    expect(page.locator("#view-banner")).to_be_visible()
    expect(page.locator(".featured-rarity strong")).to_have_text("UR")
    expect(page.locator(".rarity-seal span")).to_have_text("UR")
    assert "rarity-chip-ur.webp" in page.locator(".featured-rarity").evaluate(
        "element => getComputedStyle(element).backgroundImage"
    )
    assert page.evaluate("typeof window.Motion?.animate") == "function"
    expect(page.locator("#bgm")).to_have_attribute("src", "./assets/audio/house-beyond-stars-loop.m4a")
    assert page.evaluate("window.__ASTRAL_DEBUG__.getState().gems") == 32_000
    assert_images_loaded(page)
    assert_no_overflow(page, "desktop banner")
    page.locator("#dev-overlay").evaluate("element => element.hidden = true")
    page.wait_for_timeout(950)
    page.screenshot(path=str(ARTIFACTS / "astral-desktop.png"), full_page=True)

    page.locator('.pull-console [data-action="pull-one"]').click()
    assert page.evaluate("window.__ASTRAL_DEBUG__.getAudio().paused") is False
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
    assert_images_loaded(page)
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
    expect(page.locator(".album-tier")).to_have_count(32)
    assert page.locator('.album-card[data-rarity="ur"] .album-tier').count() == 3
    assert page.locator('.album-card[data-rarity="ssr"] .album-tier').count() == 6
    assert "rarity-chip-ur.webp" in page.locator('.album-card[data-rarity="ur"] .album-tier').first.evaluate(
        "element => getComputedStyle(element).backgroundImage"
    )
    assert "rarity-chip-ssr.webp" in page.locator('.album-card[data-rarity="ssr"] .album-tier').first.evaluate(
        "element => getComputedStyle(element).backgroundImage"
    )
    assert page.locator(".album-rarity").all_inner_texts()[0].startswith("UR ·")
    assert page.locator(".album-card:not(.is-locked)").count() > 0
    assert page.locator(".album-card:not(.is-locked) img").count() == page.locator(".album-card:not(.is-locked)").count()
    page.wait_for_timeout(650)
    page.screenshot(path=str(ARTIFACTS / "astral-album.png"), full_page=True)

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
    assert gems_after == gems_before + 1600
    page.locator('[data-action="close-topup"]').click()
    expect(page.locator("#toast")).to_be_hidden(timeout=4000)

    page.set_viewport_size({"width": 390, "height": 844})
    page.locator('[data-view="banner"]').click()
    expect(page.locator("#view-banner")).to_be_visible()
    page.wait_for_timeout(950)
    assert_no_overflow(page, "mobile banner")
    expect(page.locator(".view-tabs")).to_be_visible()
    for selector in (
        '[data-action="share-facebook"]',
        '[data-action="mute"]',
        '[data-action="open-topup"]',
    ):
        target_box = page.locator(selector).first.bounding_box()
        assert target_box and target_box["height"] >= 44, f"Mobile target is under 44px: {selector}={target_box}"
    pull_box = page.locator('.pull-console [data-action="pull-ten"]').bounding_box()
    auto_pull_box = page.locator('.pull-console [data-action="auto-pull-ten"]').bounding_box()
    tabs_box = page.locator(".view-tabs").bounding_box()
    assert pull_box and tabs_box and pull_box["y"] + pull_box["height"] <= tabs_box["y"] + 1, (
        f"Primary mobile pull action is covered by navigation: pull={pull_box}, tabs={tabs_box}"
    )
    assert auto_pull_box and tabs_box and auto_pull_box["y"] + auto_pull_box["height"] <= tabs_box["y"] + 1, (
        f"Auto-open mobile action is covered by navigation: auto={auto_pull_box}, tabs={tabs_box}"
    )
    page.screenshot(path=str(ARTIFACTS / "astral-mobile.png"), full_page=True)

    page.locator('[data-view="album"]').click()
    expect(page.locator("#view-album")).to_be_visible()
    page.wait_for_timeout(950)
    assert_no_overflow(page, "mobile album")
    page.screenshot(path=str(ARTIFACTS / "astral-mobile-album.png"), full_page=True)
    page.locator('[data-view="banner"]').click()
    expect(page.locator("#view-banner")).to_be_visible()

    page.locator('.pull-console [data-action="pull-one"]').click()
    expect(page.locator("#cinematic-buildup")).to_be_visible()
    mobile_state = page.evaluate("window.__ASTRAL_DEBUG__.getState()")
    mobile_slug = "near-miss" if mobile_state["nearMiss"] else mobile_state["buildBest"].lower()
    expect(page.locator("#warp-video")).to_have_attribute(
        "src", f"./assets/generated/cinematics/portrait/warp-{mobile_slug}.mp4"
    )
    expect(page.locator("#warp-video")).to_have_class("warp-video is-ready")
    expect_cinematic_sfx(page, "buildup", mobile_slug)
    page.locator('[data-action="skip-build"]').click()
    expect(page.locator("#cinematic-reveal")).to_be_visible()
    mobile_reveal = page.evaluate("window.__ASTRAL_DEBUG__.getState().results[0].rarity.toLowerCase()")
    expect_cinematic_sfx(page, "reveal", mobile_reveal)
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

print("Browser QA passed: shared pull deep link, clean homepage share, auto-open ×10, sampled cinematic SFX, all rarity buildups, near-miss, desktop, pull ×1, pull ×10, summary, album, stats, top-up, mobile, reduced motion")
