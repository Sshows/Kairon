rule DemoInvoiceMarker
{
    strings:
        $tag = "KAIRON-REVIEW-28"
    condition:
        $tag
}
