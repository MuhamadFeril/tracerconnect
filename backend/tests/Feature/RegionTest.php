<?php

namespace Tests\Feature;

use App\Models\District;
use App\Models\Province;
use App\Models\Regency;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_provinces_endpoint_is_public_and_returns_all_provinces(): void
    {
        $this->getJson('/api/v1/regions/provinces')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(Province::count(), 'data')
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'code', 'name'],
                ],
            ]);
    }

    public function test_regencies_endpoint_returns_only_provinces_children(): void
    {
        $province = Province::query()->firstOrFail();
        $expected = Regency::where('province_id', $province->id)->count();

        $this->getJson("/api/v1/regions/provinces/{$province->id}/regencies")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount($expected, 'data')
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'code', 'name'],
                ],
            ]);
    }

    public function test_regencies_endpoint_returns_404_for_unknown_province(): void
    {
        $this->getJson('/api/v1/regions/provinces/99999/regencies')->assertStatus(404);
    }

    public function test_districts_endpoint_returns_only_regencies_children(): void
    {
        $regency = Regency::query()->firstOrFail();
        $expected = District::where('regency_id', $regency->id)->count();

        $this->getJson("/api/v1/regions/regencies/{$regency->id}/districts")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount($expected, 'data')
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'code', 'name'],
                ],
            ]);
    }

    public function test_districts_endpoint_returns_404_for_unknown_regency(): void
    {
        $this->getJson('/api/v1/regions/regencies/99999/districts')->assertStatus(404);
    }

    public function test_region_data_is_seeded_for_all_provinces(): void
    {
        $this->assertSame(38, Province::count());
        $this->assertSame(514, Regency::count());
        $this->assertSame(7285, District::count());
        $this->assertTrue(Province::where('name', 'like', '%Papua Barat Daya%')->exists());
    }
}
