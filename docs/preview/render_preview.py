from PIL import Image, ImageDraw, ImageFont


ROOT = "E:/AI design/Chinese-self-learn/docs/preview"

COLORS = {
    "bg": "#F7F7F4",
    "surface": "#FFFFFF",
    "surfaceMuted": "#F0F2F1",
    "ink": "#171B1A",
    "muted": "#626B68",
    "soft": "#8A928F",
    "line": "#D8DEDB",
    "accent": "#08756F",
    "accentDark": "#045A55",
    "accentSoft": "#DFF5F2",
    "blue": "#2F5F98",
    "blueSoft": "#E4EEFB",
    "amber": "#A45D11",
    "amberSoft": "#FFF0CF",
    "redSoft": "#FDE7E4",
    "greenSoft": "#DDF4E8",
}


def font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/seguisb.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


F = {
    "xs": font(18),
    "sm": font(22),
    "body": font(26),
    "body_b": font(26, True),
    "h3": font(30, True),
    "h2": font(46, True),
    "zh": font(68, True),
    "zh_l": font(82, True),
}


def rounded(draw, box, fill, outline=COLORS["line"], radius=8, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text(draw, xy, value, fill=COLORS["ink"], f="body", anchor=None):
    draw.text(xy, value, fill=fill, font=F[f], anchor=anchor)


def token(draw, x, y, word, pinyin="", kind="plain"):
    fills = {
        "plain": COLORS["surface"],
        "known": COLORS["blueSoft"],
        "unknown": COLORS["amberSoft"],
        "review": COLORS["accentSoft"],
    }
    inks = {
        "plain": COLORS["ink"],
        "known": COLORS["blue"],
        "unknown": COLORS["amber"],
        "review": COLORS["accentDark"],
    }
    w = max(78, 24 + len(word) * 34)
    rounded(draw, (x, y, x + w, y + 76), fills[kind], radius=8)
    text(draw, (x + w / 2, y + 15), word, inks[kind], "body_b", "ma")
    if pinyin:
        text(draw, (x + w / 2, y + 52), pinyin, COLORS["muted"], "xs", "ma")
    return w + 12


def stat(draw, box, value, label):
    rounded(draw, box, COLORS["surfaceMuted"], radius=8)
    x1, y1, _, _ = box
    text(draw, (x1 + 22, y1 + 18), value, COLORS["ink"], "h3")
    text(draw, (x1 + 22, y1 + 62), label, COLORS["muted"], "xs")


def render_web():
    img = Image.new("RGB", (1600, 1040), COLORS["bg"])
    draw = ImageDraw.Draw(img)

    rounded(draw, (60, 50, 1540, 990), COLORS["bg"], radius=8)
    draw.rectangle((60, 50, 1540, 138), fill=COLORS["bg"], outline=COLORS["line"])
    rounded(draw, (92, 76, 134, 118), COLORS["ink"], COLORS["ink"], radius=8)
    text(draw, (113, 98), "汉", "#FFFFFF", "body_b", "mm")
    text(draw, (150, 72), "Hán Note", COLORS["ink"], "body_b")
    text(draw, (150, 104), "AI Chinese study desk", COLORS["muted"], "xs")

    nav = ["Phân tích", "Ôn tập", "Từ vựng", "Cài đặt"]
    x = 570
    for i, item in enumerate(nav):
        fill = COLORS["ink"] if i == 0 else COLORS["bg"]
        ink = "#FFFFFF" if i == 0 else COLORS["muted"]
        rounded(draw, (x, 78, x + 118, 118), fill, fill, radius=8)
        text(draw, (x + 59, 98), item, ink, "xs", "mm")
        x += 128
    rounded(draw, (1330, 78, 1486, 118), COLORS["surface"], radius=8)
    text(draw, (1350, 99), "8", COLORS["ink"], "body_b", "mm")
    text(draw, (1390, 99), "từ cần ôn", COLORS["muted"], "xs", "lm")

    text(draw, (92, 178), "Analyze", COLORS["accent"], "xs")
    text(draw, (92, 210), "Đọc hiểu đoạn tiếng Trung và chọn từ cần học", COLORS["ink"], "h2")
    text(draw, (92, 270), "Dán một câu hoặc đoạn chat ngắn. Hán Note tách theo đơn vị có nghĩa, giải thích bằng tiếng Việt.", COLORS["muted"], "body")

    rounded(draw, (92, 330, 1050, 610), COLORS["surface"], radius=8)
    text(draw, (120, 358), "Nội dung cần phân tích", COLORS["ink"], "h3")
    text(draw, (120, 398), "Dữ liệu phân tích là tạm thời. Câu nguồn chỉ được lưu khi bạn bật cho phép.", COLORS["muted"], "sm")
    rounded(draw, (120, 440, 1020, 540), "#FFFDFA", radius=8)
    text(draw, (144, 470), "你看见他吗？", COLORS["ink"], "zh")
    text(draw, (120, 570), "5 / 2.000 ký tự", COLORS["soft"], "xs")
    rounded(draw, (850, 558, 1005, 598), COLORS["accent"], COLORS["accent"], radius=8)
    text(draw, (927, 579), "Phân tích", "#FFFFFF", "xs", "mm")

    rounded(draw, (1080, 330, 1508, 610), COLORS["surface"], radius=8)
    text(draw, (1110, 358), "Trạng thái hôm nay", COLORS["ink"], "h3")
    stat(draw, (1110, 412, 1478, 486), "8", "từ cần ôn hôm nay")
    stat(draw, (1110, 500, 1478, 574), "128", "từ trong kho học")

    rounded(draw, (92, 640, 1508, 834), COLORS["surface"], radius=8)
    text(draw, (120, 675), "你看见他吗？", COLORS["ink"], "zh")
    text(draw, (120, 745), "Bạn có thấy anh ấy không?", COLORS["ink"], "body")
    text(draw, (120, 782), "Người nói đang hỏi bạn có nhìn thấy hoặc gặp người đó không.", COLORS["muted"], "sm")
    x = 120
    y = 850
    x += token(draw, x, y, "你", "ni", "known")
    x += token(draw, x, y, "看见", "kan jian", "unknown")
    x += token(draw, x, y, "他", "ta")
    x += token(draw, x, y, "吗", "ma", "review")
    token(draw, x, y, "？")

    rounded(draw, (760, 870, 1508, 956), COLORS["ink"], COLORS["ink"], radius=8)
    text(draw, (790, 914), "Đã sẵn sàng lưu 2 từ vào kho học", "#FFFFFF", "sm", "lm")
    rounded(draw, (1280, 893, 1478, 937), COLORS["accent"], COLORS["accent"], radius=8)
    text(draw, (1379, 915), "Lưu và ôn ngay", "#FFFFFF", "xs", "mm")

    img.save(f"{ROOT}/web-preview.png")


def render_mobile():
    img = Image.new("RGB", (620, 1040), COLORS["bg"])
    draw = ImageDraw.Draw(img)
    rounded(draw, (90, 28, 530, 1008), COLORS["bg"], COLORS["line"], radius=28, width=2)

    text(draw, (124, 80), "Học", COLORS["accent"], "xs")
    text(draw, (124, 112), "Đọc chat tiếng Trung nhanh hơn", COLORS["ink"], "h2")
    text(draw, (124, 220), "Dán nội dung, chọn token cần học, rồi lưu vào lịch ôn.", COLORS["muted"], "sm")

    rounded(draw, (124, 282, 496, 492), COLORS["surface"], radius=8)
    text(draw, (146, 306), "Nội dung cần phân tích", COLORS["ink"], "h3")
    rounded(draw, (146, 358, 474, 438), "#FFFDFA", radius=8)
    text(draw, (166, 380), "你看见他吗？", COLORS["ink"], "zh")
    rounded(draw, (330, 446, 474, 482), COLORS["accent"], COLORS["accent"], radius=8)
    text(draw, (402, 464), "Phân tích", "#FFFFFF", "xs", "mm")

    stat(draw, (124, 512, 306, 592), "8", "từ cần ôn")
    stat(draw, (314, 512, 496, 592), "128", "từ đã lưu")

    rounded(draw, (124, 612, 496, 812), COLORS["surface"], radius=8)
    text(draw, (146, 642), "你看见他吗？", COLORS["ink"], "zh")
    text(draw, (146, 710), "Bạn có thấy anh ấy không?", COLORS["ink"], "sm")
    x = 146
    y = 748
    x += token(draw, x, y, "你", "ni", "known")
    x += token(draw, x, y, "看见", "kan jian", "unknown")
    x = 146
    y = 832
    x += token(draw, x, y, "他", "ta")
    x += token(draw, x, y, "吗", "ma", "review")
    token(draw, x, y, "？")

    rounded(draw, (112, 846, 508, 926), COLORS["ink"], COLORS["ink"], radius=8)
    text(draw, (136, 872), "2 từ đã chọn để học", "#FFFFFF", "xs")
    rounded(draw, (330, 868, 484, 910), COLORS["accent"], COLORS["accent"], radius=8)
    text(draw, (407, 889), "Giải nghĩa", "#FFFFFF", "xs", "mm")

    rounded(draw, (112, 938, 508, 990), COLORS["surface"], radius=8)
    tabs = ["Học", "Ôn", "Từ vựng", "Cài đặt"]
    x = 124
    for i, item in enumerate(tabs):
        fill = COLORS["accentSoft"] if i == 0 else COLORS["surface"]
        ink = COLORS["accentDark"] if i == 0 else COLORS["muted"]
        rounded(draw, (x, 948, x + 86, 980), fill, fill, radius=8)
        text(draw, (x + 43, 964), item, ink, "xs", "mm")
        x += 92

    img.save(f"{ROOT}/mobile-preview.png")


render_web()
render_mobile()
